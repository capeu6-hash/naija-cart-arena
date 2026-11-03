import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, naira } from "@/lib/cart";
import { createOrder, verifyPayment } from "@/lib/shop.functions";

const PAYSTACK_PUBLIC_KEY = import.meta.env["VITE_PAYSTACK_PUBLIC_KEY"] || "pk_test_3c48bdf49d8a285898bef087a9d08d5a52b347c2";

declare global {
  interface Window {
    PaystackPop?: { setup: (o: Record<string, unknown>) => { openIframe: () => void } };
  }
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ShopArena NG" },
      { name: "description", content: "Review your cart and pay securely with Paystack." },
      { property: "og:title", content: "Checkout — ShopArena NG" },
      { property: "og:description", content: "Review your cart and pay securely with Paystack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutView,
});

function CheckoutView() {
  const { items, setQty, total, clear } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createOrder);
  const verify = useServerFn(verifyPayment);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "test@shoparena.ng", phone: "", address: "" });

  useEffect(() => {
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return;
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const pay = async () => {
    if (!/^0\d{10}$/.test(form.phone)) { toast.error("Phone must be 11 digits, e.g. 08012345678"); return; }
    if (form.name.trim().length < 2 || form.address.trim().length < 5) { toast.error("Please fill in your name and full address"); return; }
    if (!window.PaystackPop) { toast.error("Paystack is still loading, try again in a moment"); return; }
    setBusy(true);
    try {
      const order = await create({
        data: { customer_name: form.name, customer_email: form.email, phone: form.phone, address: form.address, items: items.map((i) => ({ id: i.id, qty: i.qty })) },
      });
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: order.email,
        amount: Math.round(order.total * 100),
        currency: "NGN",
        ref: order.ref,
        callback: (response: { reference: string }) => {
          verify({ data: { ref: response.reference } })
            .then(() => {
              toast.success("Payment successful! Your order is confirmed.");
              clear();
              qc.invalidateQueries({ queryKey: ["products"] });
              navigate({ to: "/" });
            })
            .catch((e: Error) => toast.error(e.message))
            .finally(() => setBusy(false));
        },
        onClose: () => {
          setBusy(false);
          toast("Payment cancelled");
        },
      });
      handler.openIframe();
    } catch (e) {
      setBusy(false);
      toast.error((e as Error).message);
    }
  };

  const field = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-muted">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-xl bg-card p-5 shadow">
          <h1 className="mb-4 text-xl font-bold text-card-foreground">Checkout</h1>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 font-medium">{i.name}</span>
                    <span className="flex items-center gap-1">
                      <button aria-label="Decrease" onClick={() => setQty(i.id, i.qty - 1)} className="rounded border border-border p-1"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center">{i.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(i.id, i.qty + 1)} className="rounded border border-border p-1"><Plus className="h-3 w-3" /></button>
                    </span>
                    <span className="w-24 text-right">{naira(i.qty * i.selling_price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{naira(total)}</span>
              </div>
              <div className="mt-5 space-y-3">
                <input id="name" className={field} placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input id="email" type="email" className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input id="phone" inputMode="numeric" maxLength={11} className={field} placeholder="Phone (11 digits)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} />
                <textarea id="address" rows={3} className={field} placeholder="Lagos Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <button disabled={busy} onClick={pay} className="w-full rounded-lg bg-success py-3 font-semibold text-success-foreground disabled:opacity-50">
                  {busy ? "Processing…" : `Pay ${naira(total)} with Paystack`}
                </button>
                <p className="text-center text-xs text-muted-foreground">Test Card: 4084084084084081 · CVV 408 · Exp 11/30 · PIN 0000</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
