# AI BioTech Store

Production storefront, member area, checkout, admin catalog management, inventory, wallet, invoices, tracking, research pages and purchased-variant protocol access.

## Production architecture

- **Frontend / deployment:** Vercel
- **Catalog, customers, orders and protocols:** Supabase
- **Product source of truth:** `public.products` and `public.variants`
- **Browser storage:** cart, session-related preferences and local wishlist only
- **Live storefront:** `/`
- **Product permalink:** `/product/:id`
- **Member area:** `/member.html`
- **Checkout:** `/checkout.html`
- **Administration:** `/admin.html`

## Safety checks

Every push to `main` runs `.github/workflows/site-smoke.yml`, which validates required route files, linked local assets, duplicate script loading, legacy deployment dependencies, routing configuration and JavaScript syntax.

Before significant production work, create a backup branch and avoid restoring an old Supabase snapshot over current catalog, order or protocol data.
