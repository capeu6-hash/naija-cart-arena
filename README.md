# Naija Cart Arena

Build ShopArena NG - Zero-Capital Single-Admin Multi-Category Arbitrage E-Market - Production Ready.

DESIGN: Background #FFFFFF, primary #FF6A00, secondary #FFF7ED #FFF0E0, text #111827 #6B7280. Rounded 2xl cards, shadow-sm hover shadow-md, mobile first, sticky header with search, bottom cart bar mobile, trust badges "Free Delivery 24-48h | 6 Months Warranty | Paystack Secured". Font Inter.

ENV VARIABLES REQUIRED: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PAYSTACK_PUBLIC_KEY, VITE_ADMIN_PASSWORD, VITE_ADMIN_EMAIL=admin@shoparena.ng. Do not hardcode. Admin route ONLY /secret-admin-2026. If user visits /admin /admin-login /dashboard redirect to homepage. Check password against VITE_ADMIN_PASSWORD. Hide columns original_cost, supplier_url, supplier_options, profit, wallets from public via Supabase RLS policies.

SUPABASE TABLES SQL TO CREATE:
products: id uuid primary key default gen_random_uuid(), name text, image_url text, images text[] array 4 images, original_cost numeric adminonly, selling_price numeric, profit numeric, supplier_url text adminonly, supplier_options jsonb array of objects {store text, url text, price numeric, in_stock bool}, category text enum Phones Fashion Electronics Power Home Beauty Appliances Gadgets, description text 200+ words Lagos persuasive sales copy, features text[] 5 bullets, specs jsonb {key:value}, rating numeric 4.6-4.9, reviews_count int 89-450, legal_info text default 'Images & trademarks belong to respective owners. ShopArena NG independent reseller sourcing from authorized distributors like Jumia Konga Slot. Not affiliated with Apple Samsung Nike etc.', in_stock boolean default true, created_at timestamp
orders: id uuid, customer_name text, phone text, address text full, state text, lga text, product_id uuid fk products, qty int default 1, total_paid numeric, supplier_cost numeric, profit numeric, status text enum paid awaiting_settlement ordered shipped delivered default paid, tracking text, paystack_ref text, best_supplier_url text, settlement_due timestamp default now+24h, created_at timestamp
wallets: id int primary key 1, total numeric default 0, withdrawable numeric default 0, pending numeric default 0
withdrawals: id uuid, amount numeric, bank text, account_number text, account_name text, status text default pending, created_at

ZERO CAPITAL BUSINESS LOGIC CRITICAL:
Homepage delivery text must be "Lagos 24-48hrs (after Paystack settlement) | Outside Lagos 2-4 Days | 6 Months ShopArena Warranty". Explain to customer: We source brand new sealed after payment confirms.
When order created: status=paid, settlement_due=now+24hours, wallets.pending += profit. Admin sees banner "ZERO CAPITAL MODE: Customer money settles tomorrow 9am. Order then using customer money. No personal capital needed. Countdown: [settlement_due]". After admin clicks Mark Ordered, status ordered. After Mark Delivered, wallets.pending -= profit, wallets.withdrawable += profit.
This allows user with zero naira to use customer payment.

CUSTOMER FRONTEND:
Header: ShopArena NG logo orange, search bar with category filter dropdown, cart icon count.
Hero: "Nigeria's Trusted Multi-Category Store | Phones Fashion Electronics Power Home" Lagos badge.
Category Chips: All Phones Fashion Electronics Power Home Beauty Appliances Gadgets clickable filter.
Product Grid: Card show ONLY image_url 1:1, name 2 lines, selling_price formatted ₦, rating stars + reviews_count, badge "ShopArena Assured". No original_cost. Click to product page.
Product Page: Image gallery main + 4 thumbs click switch, zoom. Name, rating 4.7 (450 reviews), selling_price, in_stock green. Qty selector. Add to Cart. Tabs: Description long, Features list check icons, Specs table, Delivery info zero capital explanation, Warranty 6 months replacement ShopArena, Legal full disclaimer. Related products same category.
Cart: Items list image name price qty total. Checkout Form: Full Name required, Phone required 11 digits, State select 36 states Nigeria, LGA select based on state (use list Lagos LGAs Ikeja Lekki Yaba etc for all states), Street Address detailed required, Delivery Note optional. Total. Pay with Paystack button. On Pay click: simulate success if VITE_PAYSTACK_PUBLIC_KEY missing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://naija-cart-arena.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9e8572d3-8471-421e-83e5-d54d71a734cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
