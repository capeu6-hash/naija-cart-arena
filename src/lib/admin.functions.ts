import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenOnly = z.object({ token: z.string() });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: z.string().max(200), password: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { signAdminToken } = await import("./admin-token.server");
    const envEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
    const envPass = (process.env["ADMIN_PASSWORD"] ?? "").trim();
    const okEmail = !!envEmail && data.email.trim().toLowerCase() === envEmail;
    const okPass = !!envPass && data.password.trim() === envPass;
    if (!okEmail || !okPass) return { ok: false as const };
    return { ok: true as const, token: await signAdminToken() };
  });

export const getAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./admin-token.server");
    await assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [sup, prods, priv, orders] = await Promise.all([
      supabaseAdmin.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("product_private").select("*"),
      supabaseAdmin.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200),
    ]);
    const err = sup.error || prods.error || priv.error || orders.error;
    if (err) throw new Error(err.message);
    const costs = new Map((priv.data ?? []).map((p) => [p.product_id, p]));
    const totalProfit = (orders.data ?? [])
      .filter((o) => o.status === "paid")
      .reduce((s, o) => s + o.order_items.reduce((a, i) => a + Number(i.profit_hidden), 0), 0);
    return {
      suppliers: sup.data ?? [],
      products: (prods.data ?? []).map((p) => ({
        ...p,
        cost_price_private: costs.get(p.id)?.cost_price_private ?? null,
        supplier_id: costs.get(p.id)?.supplier_id ?? null,
      })),
      orders: orders.data ?? [],
      totalProfit,
    };
  });

export const addSupplier = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; business_name: string; whatsapp: string }) =>
    z.object({ token: z.string(), business_name: z.string().trim().min(1).max(120), whatsapp: z.string().trim().max(30) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./admin-token.server");
    await assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("suppliers").insert({ business_name: data.business_name, whatsapp: data.whatsapp || null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; supplier_id: string | null; name: string; description: string; image_url: string; cost_price_private: number; selling_price: number; stock: number }) =>
      z.object({
        token: z.string(),
        supplier_id: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(160),
        description: z.string().trim().max(2000),
        image_url: z.string().trim().max(1000),
        cost_price_private: z.number().min(0),
        selling_price: z.number().positive(),
        stock: z.number().int().min(0).max(100000),
      }).parse(d),
  )
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./admin-token.server");
    await assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("products")
      .insert({ name: data.name, description: data.description || null, image_url: data.image_url || null, selling_price: data.selling_price, stock: data.stock })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await supabaseAdmin.from("product_private").insert({ product_id: p.id, supplier_id: data.supplier_id, cost_price_private: data.cost_price_private });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

// Admin confirms the bank transfer arrived: marks paid and reduces stock once.
export const confirmOrderPaid = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./admin-token.server");
    await assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", data.id).neq("status", "paid").select("id, order_items(product_id, qty)");
    if (error) throw new Error(error.message);
    for (const o of updated ?? []) {
      for (const it of o.order_items) {
        if (!it.product_id) continue;
        const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.product_id).single();
        if (p) await supabaseAdmin.from("products").update({ stock: Math.max(0, p.stock - it.qty) }).eq("id", it.product_id);
      }
    }
    return { ok: true };
  });
