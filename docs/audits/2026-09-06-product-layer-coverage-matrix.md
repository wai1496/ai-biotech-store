# Product Layer Coverage Matrix — 2026-09-06

Scope: staging/review branch only. Production untouched.

## Confirmed active Vial/Pen strength combinations missing from supplied strength-layer assets

| Category | Hex | Missing supplied strength layer |
|---|---|---|
| Solvent | #2563EB | 3mL blue |
| Solvent | #2563EB | 10mL blue |
| Regeneration | #2EAA61 | 10mg green |
| Hormone | #E0B300 | 5mg yellow |
| Healing | #E63C3C | 20mg red |

These combinations are active in staging but are not present in the current supplied `public/product-visuals/layers/strengths` asset tree.

## Renderer policy

- Vial and Pen: use supplied base + category template + product name + strength layers when the exact asset exists.
- Known missing strength assets: do not depend on a broken image; render a category-coloured visible fallback label using the exact selected strength.
- Blend strength labels normalize to their leading total strength for asset matching, e.g. `10mg (5mg + 5mg)` -> `10mg`.
- Cartridge: direct approved master only; no dynamic Vial/Pen overlays.
- Product name aliases cover database/display names that differ from supplied layer filenames, including GLOW 70MG, Oxytocin Acetate, and CJC DAC/no-DAC variants.

## Current gate

WP-03 remains open until rendered browser QA passes across storefront card, product detail, cart, checkout, mobile and desktop. This audit documents asset coverage only and is not itself a visual PASS.
