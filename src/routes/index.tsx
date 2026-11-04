import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart, naira } from "@/lib/cart";

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("public_products")
      .select("id, name, description, image_url, selling_price, stock")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p) => ({ ...p, id: p.id!, name: p.name ?? "", selling_price: Number(p.selling_price ?? 0), stock: p.stock ?? 0 }));
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopArena NG — Shop with fast Lagos delivery" },
      { name: "description", content: "Shop quality products in Nigeria with 24-48hr Lagos delivery and simple bank transfer payment." },
      { property: "og:title", content: "ShopArena NG — Shop with fast Lagos delivery" },
      { property: "og:description", content: "Quality products, 24-48hr Lagos delivery, pay by bank transfer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: ShopView,
});

function ShopView() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { add, count, total } = useCart();
  return (
    <div className="min-h-screen bg-muted pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {products.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No products yet, go to <Link to="/admin" className="font-semibold text-foreground underline">admin</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition hover:shadow-md">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 w-full bg-secondary" />
                )}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-bold text-card-foreground">{p.name}</h3>
                  <p className="font-bold text-success">{naira(Number(p.selling_price))}</p>
                  <p className="text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
                  <button
                    disabled={p.stock <= 0}
                    onClick={() => {
                      add({ id: p.id, name: p.name, selling_price: Number(p.selling_price), stock: p.stock, image_url: p.image_url });
                      toast.success("Added to cart");
                    }}
                    className="mt-auto rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background disabled:opacity-40"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 md:hidden">
          <Link to="/checkout" className="block rounded-lg bg-success py-3 text-center font-semibold text-success-foreground">
            Checkout · {count} item{count > 1 ? "s" : ""} · {naira(total)}
          </Link>
        </div>
      )}
    </div>
  );
}
