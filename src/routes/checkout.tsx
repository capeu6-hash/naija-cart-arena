import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, naira } from "@/lib/cart";
import { createOrder, markTransferSent, getOrderStatus } from "@/lib/shop.functions";
import { BANK, COUNTRIES, LAGOS_AREAS, NG_STATES, deliveryFee } from "@/lib/delivery";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ShopArena NG" },
      { name: "description", content: "Enter your delivery address and pay by bank transfer." },
      { property: "og:title", content: "Checkout — ShopArena NG" },
      { property: "og:description", content: "Enter your delivery address and pay by bank transfer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutView,
});

type Placed = Awaited<ReturnType<typeof createOrder>>;
const field = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";
const label = "mb-1 block text-xs font-semibold text-foreground";

function PaymentStatus({ ref_, total }: { ref_: string; total: number }) {
  const check = useServerFn(getOrderStatus);
  const [status, setStatus] = useState("transfer_sent");
  useEffect(() => {
    if (status === "paid") return;
    const t = setInterval(() => {
      check({ data: { ref: ref_ } }).then((r) => {
        if (r.status === "paid") { setStatus("paid"); toast.success("Payment confirmed! Your order is being processed."); }
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [status, ref_, check]);
  if (status === "paid")
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="text-xl font-extrabold text-success">Payment Confirmed!</h1>
        <p className="text-sm text-muted-foreground">We received {naira(total)}. Your order is now being processed for delivery.</p>
        <p className="text-xs text-muted-foreground">Order {ref_}</p>
      </div>
    );
  return (
    <div className="space-y-3 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
      <h1 className="text-lg font-bold">Thank you! We're confirming your payment</h1>
      <p className="text-sm text-muted-foreground">Keep this page open — it will update automatically once your transfer of {naira(total)} is confirmed.</p>
      <p className="text-xs text-muted-foreground">Order {ref_} · save this reference</p>
    </div>
  );
}

function CheckoutView() {
  const { items, setQty, total: cartTotal, clear } = useCart();
  const create = useServerFn(createOrder);
  const markSent = useServerFn(markTransferSent);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", country: "Nigeria", state: "Lagos", town: "", region: "", address: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isNg = f.country === "Nigeria";

  const subtotal = placed?.subtotal ?? cartTotal;
  const fee = placed?.fee ?? deliveryFee(f.country, f.state, f.region);
  const grand = placed?.total ?? subtotal + fee;
  const summary = placed?.lines ?? items.map((i) => ({ name: i.name, qty: i.qty, price: i.selling_price }));

  const submit = async (): Promise<void> => {
    if (f.name.trim().length < 2) { toast.error("Enter your full name"); return; }
    if (!/^\+?\d{10,15}$/.test(f.phone)) { toast.error("Enter a valid phone / WhatsApp number"); return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { toast.error("Email looks wrong"); return; }
    if (f.state.trim().length < 2 || f.town.trim().length < 2 || f.region.trim().length < 2) { toast.error("Fill in state, town and area"); return; }
    if (f.address.trim().length < 10) { toast.error("Enter your detailed home address"); return; }
    setBusy(true);
    try {
      const o = await create({ data: { customer_name: f.name, customer_email: f.email, phone: f.phone, country: f.country, state: f.state, town: f.town, region: f.region, address: f.address, items: items.map((i) => ({ id: i.id, qty: i.qty })) } });
      setPlaced(o);
      clear();
      setStep("pay");
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sent = async () => {
    if (!placed) return;
    setBusy(true);
    try { await markSent({ data: { ref: placed.ref } }); } catch { /* still show next step */ }
    setBusy(false);
    setStep("done");
    window.scrollTo({ top: 0 });
  };

  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success("Copied"));

  if (!placed && items.length === 0) {
    return (
      <div className="min-h-screen bg-muted"><SiteHeader />
        <main className="mx-auto max-w-md px-4 py-6"><div className="rounded-2xl bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Your cart is empty.</p></div></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 md:grid-cols-[1fr_340px]">
        <section className="order-2 rounded-2xl bg-card p-5 shadow-sm md:order-1">
          {step === "form" && (
            <>
              <h1 className="mb-4 text-xl font-bold">Delivery details</h1>
              <div className="space-y-3">
                <div><label className={label} htmlFor="name">Full Name *</label><input id="name" className={field} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Chinedu Okafor" /></div>
                <div><label className={label} htmlFor="phone">Phone / WhatsApp Number *</label><input id="phone" inputMode="tel" maxLength={16} className={field} value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d+]/g, ""))} placeholder="08012345678" /></div>
                <div><label className={label} htmlFor="email">Email (optional)</label><input id="email" type="email" className={field} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div><label className={label} htmlFor="country">Country / Nationality *</label>
                  <select id="country" className={field} value={f.country} onChange={(e) => setF((p) => ({ ...p, country: e.target.value, state: e.target.value === "Nigeria" ? "Lagos" : "", region: "" }))}>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select></div>
                <div><label className={label} htmlFor="state">State *</label>
                  {isNg ? (
                    <select id="state" className={field} value={f.state} onChange={(e) => setF((p) => ({ ...p, state: e.target.value, region: "" }))}>
                      {NG_STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <input id="state" className={field} value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="State / Province" />}
                </div>
                <div><label className={label} htmlFor="town">Town / City *</label><input id="town" className={field} value={f.town} onChange={(e) => set("town", e.target.value)} /></div>
                <div><label className={label} htmlFor="region">Region / LGA / Area *</label>
                  {isNg && f.state === "Lagos" ? (
                    <select id="region" className={field} value={f.region} onChange={(e) => set("region", e.target.value)}>
                      <option value="">Select area</option>
                      {LAGOS_AREAS.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  ) : <input id="region" className={field} value={f.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Wuse, GRA" />}
                </div>
                <div><label className={label} htmlFor="address">Detailed Home Address *</label><textarea id="address" rows={3} className={field} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="No 12 Adeola Street, Opposite GTBank, Lekki" /></div>
                <button disabled={busy} onClick={submit} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? "Placing order…" : `Continue to payment · ${naira(grand)}`}
                </button>
              </div>
            </>
          )}

          {step === "pay" && placed && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold">PAY VIA BANK TRANSFER</h1>
              <p className="text-sm text-muted-foreground">Transfer the Total Amount to:</p>
              <div className="space-y-2 rounded-2xl border border-border bg-muted p-4 text-sm">
                <Row k="Bank Name" v={BANK.name} />
                <Row k="Account Name" v={BANK.accountName} />
                <Row k="Account Number" v={BANK.accountNumber} onCopy={() => copy(BANK.accountNumber)} />
                <Row k="Amount" v={naira(placed.total)} onCopy={() => copy(String(placed.total))} />
                <Row k="Order Ref" v={placed.ref} />
              </div>
              <button disabled={busy} onClick={sent} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">I Have Sent The Money</button>
            </div>
          )}

          {step === "done" && placed && <PaymentStatus ref_={placed.ref} total={placed.total} />}
        </section>

        <aside className="order-1 h-fit rounded-2xl bg-card p-5 shadow-sm md:sticky md:top-20 md:order-2">
          <h2 className="mb-3 font-bold">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {step === "form"
              ? items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <span className="flex-1">{i.name}</span>
                    <span className="flex items-center gap-1">
                      <button aria-label="Decrease" onClick={() => setQty(i.id, i.qty - 1)} className="rounded border border-border p-1"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center">{i.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(i.id, i.qty + 1)} className="rounded border border-border p-1"><Plus className="h-3 w-3" /></button>
                    </span>
                    <span className="w-20 text-right">{naira(i.qty * i.selling_price)}</span>
                  </li>
                ))
              : summary.map((l) => (
                  <li key={l.name} className="flex justify-between"><span>{l.name} × {l.qty}</span><span>{naira(l.price * l.qty)}</span></li>
                ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Product Price</span><span>{naira(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee{f.region || !isNg ? "" : " (pick area)"}</span><span>+ {naira(fee)}</span></div>
            <div className="flex justify-between pt-1 text-base font-bold"><span>Total Amount To Pay</span><span className="text-primary">{naira(grand)}</span></div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({ k, v, onCopy }: { k: string; v: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="flex items-center gap-2 font-bold">{v}{onCopy && <button aria-label={`Copy ${k}`} onClick={onCopy}><Copy className="h-4 w-4" /></button>}</span>
    </div>
  );
}
