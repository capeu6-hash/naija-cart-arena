import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deliveryFee } from "./delivery";

const orderInput = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(200).or(z.literal("")),
  phone: z.string().trim().regex(/^\+?\d{10,15}$/, "Enter a valid phone number"),
  country: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  town: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(500),
  items: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1).max(50),
});

// Creates an order awaiting bank transfer; prices and delivery fee computed on the server.
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
    const subtotal = lines.reduce((s, l) => s + l.selling_price * l.qty, 0);
    const fee = deliveryFee(data.country, data.state, data.region);
    const total = subtotal + fee;
    const ref = `SA${Date.now().toString().slice(-7)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: order, error: oe } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name, customer_email: data.customer_email || null, phone: data.phone,
        country: data.country, state: data.state, town: data.town, region: data.region, address: data.address,
        subtotal, delivery_fee: fee, total, order_ref: ref, status: "awaiting_transfer",
      })
      .select("id")
      .single();
    if (oe) throw new Error(oe.message);
    const { error: ie } = await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (ie) throw new Error(ie.message);
    return { ref, subtotal, fee, total, lines: lines.map((l) => ({ name: l.product_name, qty: l.qty, price: l.selling_price })) };
  });

// Customer says they've transferred. Admin still confirms the money arrived.
export const markTransferSent = createServerFn({ method: "POST" })
  .inputValidator((d: { ref: string }) => z.object({ ref: z.string().min(5).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ status: "transfer_sent" }).eq("order_ref", data.ref).eq("status", "awaiting_transfer");
    return { ok: true };
  });

// Public status check by order reference (refs are random, unguessable).
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { ref: string }) => z.object({ ref: z.string().min(5).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders").select("status").eq("order_ref", data.ref).maybeSingle();
    return { status: (o?.status as string | undefined) ?? "unknown" };
  });
