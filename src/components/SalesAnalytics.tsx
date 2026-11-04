import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { naira } from "@/lib/cart";

type Item = { product_name: string; qty: number; selling_price: number | string; profit_hidden: number | string };
type Order = { status: string; created_at: string; delivery_fee: number | string; order_items: Item[] };

const RANGES = { 7: "7 days", 30: "30 days", 90: "90 days" } as const;

export function SalesAnalytics({ orders }: { orders: Order[] }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const stats = useMemo(() => {
    const since = Date.now() - days * 86400000;
    const paid = orders.filter((o) => o.status === "paid" && new Date(o.created_at).getTime() >= since);
    const byDay = new Map<string, { day: string; Revenue: number; Profit: number; Loss: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDay.set(d, { day: d.slice(5), Revenue: 0, Profit: 0, Loss: 0 });
    }
    const byProduct = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    let revenue = 0, profit = 0, loss = 0, delivery = 0;
    for (const o of paid) {
      const row = byDay.get(o.created_at.slice(0, 10));
      delivery += Number(o.delivery_fee);
      for (const i of o.order_items) {
        const rev = Number(i.selling_price) * i.qty;
        const p = Number(i.profit_hidden);
        revenue += rev;
        if (p >= 0) profit += p; else loss += -p;
        if (row) { row.Revenue += rev; if (p >= 0) row.Profit += p; else row.Loss += -p; }
        const pr = byProduct.get(i.product_name) ?? { name: i.product_name, qty: 0, revenue: 0, profit: 0 };
        pr.qty += i.qty; pr.revenue += rev; pr.profit += p;
        byProduct.set(i.product_name, pr);
      }
    }
    const pending = orders.filter((o) => o.status !== "paid").length;
    return {
      paidCount: paid.length, pending, revenue, profit, loss, net: profit - loss, delivery,
      margin: revenue > 0 ? ((profit - loss) / revenue) * 100 : 0,
      chart: [...byDay.values()],
      products: [...byProduct.values()].sort((a, b) => b.profit - a.profit),
    };
  }, [orders, days]);

  const cards = [
    { label: "Sales (paid)", value: naira(stats.revenue), sub: `${stats.paidCount} orders` },
    { label: "Profit", value: naira(stats.profit), cls: "text-success" },
    { label: "Loss", value: naira(stats.loss), cls: "text-destructive" },
    { label: "Net profit", value: naira(stats.net), sub: `${stats.margin.toFixed(1)}% margin`, cls: stats.net >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div className="space-y-4 rounded-xl bg-card p-5 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">Profit & Loss Analysis</h3>
        <div className="flex gap-1">
          {(Object.keys(RANGES) as unknown as (7 | 30 | 90)[]).map((k) => (
            <button key={k} onClick={() => setDays(Number(k) as 7 | 30 | 90)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(k) === days ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {RANGES[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-extrabold ${c.cls ?? ""}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Delivery fees collected: {naira(stats.delivery)} · {stats.pending} order(s) not yet paid (not counted)
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={stats.chart} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip formatter={(v: number) => naira(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Revenue" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Profit" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Loss" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold">By product</h4>
        {stats.products.length === 0 ? <p className="text-sm text-muted-foreground">No paid sales in this period.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-1">Product</th><th>Sold</th><th>Sales</th><th>Profit/Loss</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.products.map((p) => (
                  <tr key={p.name}>
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td>{p.qty}</td>
                    <td>{naira(p.revenue)}</td>
                    <td className={p.profit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>{naira(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
