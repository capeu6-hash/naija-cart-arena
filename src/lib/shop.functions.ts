import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderInput = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(200),
  phone: z.string().trim().regex(/^0\d{10}$/, "Phone must be 11 digits"),
  address: z.string().trim().min(5).max(500),
  items: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1).max(50),
});

// Creates a pending order with prices taken from the database (never the browser).
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof orderInput>) => orderInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.id);
    const [{ data: prods, error }, { data: priv }] = await Promise.all([
      supabaseAdmin.from("products").select("id, name, selling_price, stock").in("id", ids),
      supabaseAdmin.from("product_private").select("product_id, cost_price_private").in("product_id", ids),
    ]);
    if (error) throw new Error(error.message);
    const costs = new Map((priv ?? []).map((p) => [p.product_id, Number(p.cost_price_private)]));
    const lines = data.items.map((i) => {
      const p = prods?.find((x) => x.id === i.id);
      if (!p) throw new Error("A product in your cart is no longer available");
      if (p.stock < i.qty) throw new Error(`Only ${p.stock} left of ${p.name}`);
      const price = Number(p.selling_price);
      return { product_id: p.id, product_name: p.name, qty: i.qty, selling_price: price, profit_hidden: (price - (costs.get(p.id) ?? price)) * i.qty };
    });
    const total = lines.reduce((s, l) => s + l.selling_price * l.qty, 0);
    const ref = `SA_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { data: order, error: oe } = await supabaseAdmin
      .from("orders")
      .insert({ customer_name: data.customer_name, customer_email: data.customer_email, phone: data.phone, address: data.address, total, paystack_ref: ref, status: "pending" })
      .select("id")
      .single();
    if (oe) throw new Error(oe.message);
    const { error: ie } = await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (ie) throw new Error(ie.message);
    return { ref, total, email: data.customer_email };
  });

// Confirms payment with Paystack using the secret key, then marks the order paid.
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { ref: string }) => z.object({ ref: z.string().min(5).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id, total, status, order_items(product_id, qty)").eq("paystack_ref", data.ref).single();
    if (!order) throw new Error("Order not found");
    if (order.status === "paid") return { ok: true };
    const secret = process.env["STRIPE_TEST_API_KEY"];
    if (!secret) throw new Error("Payment verification is not configured");
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.ref)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await res.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string } };
    const paid = json.status && json.data?.status === "success" && json.data.currency === "NGN" && json.data.amount === Math.round(Number(order.total) * 100);
    if (!paid) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw new Error("Payment could not be verified");
    }
    const { data: updated } = await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id).eq("status", "pending").select("id");
    if (updated && updated.length) {
      for (const it of order.order_items) {
        if (!it.product_id) continue;
        const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.product_id).single();
        if (p) await supabaseAdmin.from("products").update({ stock: Math.max(0, p.stock - it.qty) }).eq("id", it.product_id);
      }
    }
    return { ok: true };
  });
