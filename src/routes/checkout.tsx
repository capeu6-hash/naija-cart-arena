import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Copy, CheckCircle2, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, naira } from "@/lib/cart";
import { createOrder, markTransferSent } from "@/lib/shop.functions";
import { BANK, COUNTRIES, LAGOS_AREAS, NG_STATES, WHATSAPP_NUMBER, deliveryFee } from "@/lib/delivery";

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

  const submit = async (): Promise<unknown> => {
    if (f.name.trim().length < 2) return toast.error("Enter your full name");
    if (!/^\+?\d{10,15}$/.test(f.phone)) return toast.error("Enter a valid phone / WhatsApp number");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("Email looks wrong");
    if (f.state.trim().length < 2 || f.town.trim().length < 2 || f.region.trim().length < 2) return toast.error("Fill in state, town and area");
    if (f.address.trim().length < 10) return toast.error("Enter your detailed home address");
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

  const waText = placed
    ? [
        `Hello ShopArena NG, I have paid for my order ${placed.ref}.`,
        `Name: ${f.name}`,
        `Phone: ${f.phone}`,
        `Products: ${placed.lines.map((l) => `${l.name} x${l.qty}`).join(", ")}`,
        `Address: ${f.address}, ${f.region}, ${f.town}, ${f.state}, ${f.country}`,
        `Delivery Fee: ${naira(placed.fee)}`,
        `Total Amount Paid: ${naira(placed.total)}`,
        `I'm attaching my payment receipt.`,
      ].join("\n")
    : "";

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

          {step === "done" && placed && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h1 className="text-lg font-bold">Thank you! Send your payment receipt on WhatsApp to confirm your order</h1>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-4 text-lg font-bold text-success-foreground">
                <MessageCircle className="h-6 w-6" /> Send Receipt on WhatsApp
              </a>
              <p className="text-xs text-muted-foreground">Order {placed.ref}</p>
            </div>
          )}
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
