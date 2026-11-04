import { Link } from "@tanstack/react-router";
import { ShoppingCart, ShieldCheck } from "lucide-react";
import { useCart, naira } from "@/lib/cart";

export function SiteHeader() {
  const { count, total } = useCart();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-foreground">
            ShopArena <span className="text-primary">NG</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
            <Link to="/checkout" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background">
              <ShoppingCart className="h-4 w-4" /> {count} · {naira(total)}
            </Link>
          </div>
        </div>
      </header>
      <div className="bg-success px-4 py-2 text-center text-xs font-medium text-success-foreground sm:text-sm">
        Delivery in Lagos 24-48hrs · Pay by bank transfer
      </div>
    </>
  );
}
