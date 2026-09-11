# Secure EasyParcel checkout plan

## Current finding
The browser checkout can fetch and select EasyParcel rates, but the current `public.create_order(...)` function does not trust `p_shipping_fee`. It calls `private.calculate_shipping_fee(p_items)` and the private order creator also recalculates shipping from `stores.flat_shipping_fee`.

Because the flat store fee has been set to zero while EasyParcel is being introduced, shipping would currently be stored as RM0 even after a customer selects a paid EasyParcel service. This must be fixed before EasyParcel checkout is released.

## Release-safe design
Do not simply trust a shipping amount sent by the browser.

1. `/api/easyparcel-rates` authenticates the member, obtains EasyParcel rates server-side, and stores a short-lived quote record containing user, address/postcode/state, service ID, rate ID, quoted amount and expiry.
2. The browser receives a quote ID plus display-safe courier/service data.
3. Order creation sends the selected quote ID, not an arbitrary shipping amount.
4. The database order function validates that the quote belongs to `auth.uid()`, is unexpired, matches the checkout address and selected service, and consumes it exactly once.
5. The validated quote amount becomes `orders.shipping_fee` and participates in wallet/grand-total calculations atomically with order creation.
6. EasyParcel booking re-quotes before shipment purchase. If the carrier price has changed materially, admin receives a re-quote warning instead of silently paying a different amount.

## Safety gates
- Preview only until quote creation, order total, ToyyibPay amount, callback, booking, AWB/label and tracking all pass.
- Do not modify Production order functions just to make Preview appear to work.
- Do not accept client-supplied shipping price without a server/database verification record.
- Keep White Clean as default storefront; dark storefront remains alternate theme.
