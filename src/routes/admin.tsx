import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SalesAnalytics } from "@/components/SalesAnalytics";
import { naira } from "@/lib/cart";
import { adminLogin, getAdminDashboard, addSupplier, addProduct, confirmOrderPaid } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ShopArena NG" },
      { name: "description", content: "ShopArena NG store management." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — ShopArena NG" },
      { property: "og:description", content: "ShopArena NG store management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TOKEN_KEY = "shoparena_admin";
type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
const field = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn = "w-full rounded-lg bg-foreground py-2 text-sm font-semibold text-background disabled:opacity-50";

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(localStorage.getItem(TOKEN_KEY)), []);
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };
  return (
    <div className="min-h-screen bg-muted">
      <SiteHeader />
      {token ? <AdminView token={token} onLogout={logout} /> : <Login onLogin={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const login = useServerFn(adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await login({ data: { email, password } });
      if (r.ok) onLogin(r.token);
      else toast.error("Wrong email or password");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-3 rounded-xl bg-card p-8 shadow">
      <h2 className="text-xl font-bold">Admin Login</h2>
      <input id="aemail" className={field} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input id="apass" type="password" className={field} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy} className={btn}>{busy ? "Checking…" : "Login"}</button>
    </form>
  );
}

function AdminView({ token, onLogout }: { token: string; onLogout: () => void }) {
  const getDash = useServerFn(getAdminDashboard);
  const addSup = useServerFn(addSupplier);
  const addProd = useServerFn(addProduct);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [sup, setSup] = useState({ business_name: "", whatsapp: "" });
  const empty = { supplier_id: "", name: "", description: "", image_url: "", cost: "", price: "", stock: "100" };
  const [prod, setProd] = useState(empty);

  const load = useCallback(async () => {
    try {
      setDash(await getDash({ data: { token } }));
    } catch {
      toast.error("Session expired, please log in again");
      onLogout();
    }
  }, [getDash, token, onLogout]);
  useEffect(() => {
    load();
  }, [load]);

  const cost = Number(prod.cost), price = Number(prod.price);
  const showProfit = prod.cost !== "" && prod.price !== "";

  const submitSup = async () => {
    if (!sup.business_name.trim()) { toast.error("Business name is required"); return; }
    try {
      await addSup({ data: { token, ...sup } });
      setSup({ business_name: "", whatsapp: "" });
      toast.success("Supplier added");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const submitProd = async () => {
    if (!prod.name.trim() || !showProfit || price <= 0) { toast.error("Name, cost and selling price are required"); return; }
    try {
      await addProd({ data: { token, supplier_id: prod.supplier_id || null, name: prod.name, description: prod.description, image_url: prod.image_url, cost_price_private: cost, selling_price: price, stock: Math.max(0, Math.floor(Number(prod.stock) || 0)) } });
      setProd(empty);
      toast.success("Product added");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (!dash) return <p className="py-20 text-center text-muted-foreground">Loading dashboard…</p>;

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex items-start justify-between rounded-xl bg-foreground p-6 text-background">
        <div>
          <p className="text-sm opacity-70">Total Hidden Profit</p>
          <p className="text-3xl font-extrabold">{naira(dash.totalProfit)}</p>
          <p className="mt-1 text-xs opacity-70">Customers never see cost_price_private</p>
        </div>
        <button onClick={onLogout} className="rounded-lg border border-background/30 px-3 py-1 text-sm">Log out</button>
      </div>

      <SalesAnalytics orders={dash.orders} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl bg-card p-5 shadow">
          <h3 className="font-bold">Add Supplier</h3>
          <input id="supname" className={field} placeholder="Business Name" value={sup.business_name} onChange={(e) => setSup({ ...sup, business_name: e.target.value })} />
          <input id="supwhat" className={field} placeholder="WhatsApp" value={sup.whatsapp} onChange={(e) => setSup({ ...sup, whatsapp: e.target.value })} />
          <button onClick={submitSup} className={btn}>Add Supplier</button>
          <ul className="space-y-1 pt-2 text-xs text-muted-foreground">
            {dash.suppliers.map((s) => <li key={s.id}>{s.business_name}{s.whatsapp ? ` · ${s.whatsapp}` : ""}</li>)}
          </ul>
        </div>

        <div className="space-y-3 rounded-xl bg-card p-5 shadow">
          <h3 className="font-bold">Add Product</h3>
          <select className={field} value={prod.supplier_id} onChange={(e) => setProd({ ...prod, supplier_id: e.target.value })}>
            <option value="">No supplier</option>
            {dash.suppliers.map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}
          </select>
          <input className={field} placeholder="Product name" value={prod.name} onChange={(e) => setProd({ ...prod, name: e.target.value })} />
          <textarea className={field} rows={2} placeholder="Description (optional)" value={prod.description} onChange={(e) => setProd({ ...prod, description: e.target.value })} />
          <input className={field} placeholder="Image URL" value={prod.image_url} onChange={(e) => setProd({ ...prod, image_url: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" className={field} placeholder="Cost ₦" value={prod.cost} onChange={(e) => setProd({ ...prod, cost: e.target.value })} />
            <input type="number" className={field} placeholder="Price ₦" value={prod.price} onChange={(e) => setProd({ ...prod, price: e.target.value })} />
            <input type="number" className={field} placeholder="Stock" value={prod.stock} onChange={(e) => setProd({ ...prod, stock: e.target.value })} />
          </div>
          {showProfit && (
            <p className={`text-sm font-semibold ${price - cost >= 0 ? "text-success" : "text-destructive"}`}>
              Profit per unit: {naira(price - cost)}
            </p>
          )}
          <button onClick={submitProd} className={btn}>Add Product</button>
        </div>
      </div>

      <div className="rounded-xl bg-card p-5 shadow">
        <h3 className="mb-3 font-bold">Products ({dash.products.length})</h3>
        <ul className="divide-y divide-border text-sm">
          {dash.products.map((p) => (
            <li key={p.id} className="flex justify-between gap-2 py-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">cost {p.cost_price_private != null ? naira(Number(p.cost_price_private)) : "—"} · sells {naira(Number(p.selling_price))} · {p.stock} left</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-card p-5 shadow">
        <h3 className="mb-3 font-bold">Orders</h3>
        {dash.orders.some((o) => o.status === "transfer_sent") && (
          <div className="mb-3 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary">
            🔔 {dash.orders.filter((o) => o.status === "transfer_sent").length} customer(s) say they've sent money — check your OPay and tap Confirm paid.
          </div>
        )}
        {dash.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
          <ul className="divide-y divide-border text-sm">
            {dash.orders.map((o) => (
              <li key={o.id} className="grid gap-1 py-2 sm:grid-cols-5">
                <span className="font-medium">{o.customer_name}</span>
                <span>{naira(Number(o.total))}</span>
                <span className={o.status === "paid" ? "text-success" : o.status === "transfer_sent" ? "font-semibold text-primary" : "text-muted-foreground"}>{o.status === "transfer_sent" ? "Money sent — confirm" : o.status}</span>
                <span className="text-xs text-muted-foreground">{o.order_ref ?? o.paystack_ref} · {o.phone} · {[o.region, o.town, o.state, o.country].filter(Boolean).join(", ")}{o.status !== "paid" && <ConfirmBtn token={token} id={o.id} onDone={load} />}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-NG")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ConfirmBtn({ token, id, onDone }: { token: string; id: string; onDone: () => void }) {
  const confirm = useServerFn(confirmOrderPaid);
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); try { await confirm({ data: { token, id } }); toast.success("Marked as paid"); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }}
      className="ml-2 rounded bg-success px-2 py-0.5 font-semibold text-success-foreground disabled:opacity-50">Confirm paid</button>
  );
}
