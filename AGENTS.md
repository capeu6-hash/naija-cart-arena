<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Product cost/supplier data lives in `product_private` (no RLS policies, server-only via admin client); the browser may only read `products`. Why: keeps cost prices unreadable by customers.
- Admin access uses server-checked ADMIN_EMAIL/ADMIN_PASSWORD secrets and an HMAC token (`src/lib/admin-token.server.ts`); never put admin credentials in VITE_ vars. Why: VITE_ values ship to every visitor.
- Orders (items + delivery fee from `src/lib/delivery.ts`) are priced server-side; payment is manual bank transfer and only the admin marks an order paid. Why: browser totals can be forged.
