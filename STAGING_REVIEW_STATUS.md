# AI BioTech Staging Review Gate

**Environment:** STAGING ONLY

**Production merge:** NOT APPROVED

## Current storefront milestone

- Clean white / navy professional default storefront
- Responsive desktop / notebook / tablet / mobile layouts
- Direct Strength + Vial / Cartridge / Pen variant selection
- Exact staging price, stock, SKU and image updates
- Add to Cart and cart drawer
- Product Information modal
- Product-linked Research Insight modal
- Mobile menu and sticky mobile cart
- Staging Account and Checkout safety gates
- No production order/payment/customer/wallet writes
- `noindex,nofollow`

## Data integrity

Staging catalog mirrors the current production public catalog:
- 39 products
- 224 variants
- 222 active variants
- 72 active Cartridge
- 74 active Pen
- 76 active Vial

Variant catalog checksum (ID/product/strength/format/SKU/price/stock/active):
`b99f2c5c878c238d6f591aab5872e72c`

Product checksum (ID/name/slug/category/featured/published/status):
`ce3dfc04ebea8cc8be0aa63477e7ff7a`

## Release gate

Do not merge this branch into `main` until:
1. User visually approves storefront direction.
2. Critical UI interaction QA passes.
3. Checkout/member services are isolated and tested in staging.
4. Operations Control Center replacement is ready enough to preserve manual management.
5. Full regression and rollback checks pass.
