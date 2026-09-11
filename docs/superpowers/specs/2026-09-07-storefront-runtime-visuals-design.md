# AI BioTech Storefront Runtime Visuals — Phase 2A Design

## Purpose
Integrate the approved Pen, Vial, and Cartridge visual-composition rules into a preview storefront path so product visuals can be generated at runtime from a small set of reusable masters instead of maintaining large numbers of manually generated variant images.

## Scope
Phase 2A is preview-only. It changes how visual placeholders are composed in a preview branch but does not change production data, Supabase schema/RLS/Auth, payment configuration, domains/DNS, secrets, environment variables, billing, or account ownership. It does not deploy to production until separate release QA passes.

## Existing storefront behavior
The current storefront uses `center-fix.js` as the authoritative canvas compositor for shared Vial/Pen masters. Cartridge currently bypasses composition and renders an admin-managed or bundled standard Cartridge image directly.

Real uploaded product/variant images have priority over generated placeholders and must keep that priority.

## Recommended architecture
Create one shared browser renderer module as the single source of truth for placeholder composition. The storefront and the standalone composer both call the same renderer rules rather than maintaining separate geometry or fit logic.

The runtime flow is:

1. Resolve the selected product + strength + format variant.
2. If the variant has a real uploaded image, render it unchanged.
3. Otherwise resolve the approved master for the selected format.
4. Apply the format-specific visual rule.
5. Render a 1536×1536 canvas preview inside the existing product visual host.
6. On image/CORS/render failure, fall back to the current approved static image without blocking catalog or checkout.

## Format rules

### Pen
- Use the approved blank Pen master.
- Product name is dynamic.
- Strength is dynamic.
- Category accent color is dynamic.
- Name and strength remain inside the existing fixed Pen fields.
- Long text uses the existing fit-to-field behavior.
- Hardware and geometry remain unchanged.

### Vial
- Use the approved realistic blank Vial master.
- White cap is the standard and remains fixed.
- Glass, metal ring, stopper/rubber, powder, reflections, and branding remain fixed.
- Product name is dynamic.
- Strength is dynamic.
- Approved label accents and lower wave follow category color.
- Long product names may wrap to two centered lines inside the name field.
- Very light category colors may use a darker text derivative for readability while the accent color itself remains unchanged.

### Cartridge
- Use the approved tall straight glass Cartridge geometry: silver top, blue-tinted glass/liquid, dark black plunger/base, AI BioTech branding.
- Short clean names use the approved blank Cartridge master and dynamic composition.
- Dynamic Cartridge mode includes product name, strength, and approved accent regions only.
- Cartridge hardware is never recolored.
- Long or complex product names do not wrap or squeeze vertically. They use the approved standard printed Cartridge visual instead.
- The initial short-name threshold is 14 characters after normalization. This includes examples such as `GHK-CU`, `BPC-157`, `RETATRUTIDE`, `CAGRILINTIDE`, `TESAMORELIN`, `PINEALON`, `KLOW`, and `DSIP`. Longer examples such as `SEMAGLUTIDE + CAGRILINTIDE` and `CJC-1295 WITHOUT DAC + IPAMORELIN` use the standard Cartridge reference.
- The standard Cartridge reference remains valid as a fallback even for short names if no approved blank Cartridge master is available at runtime.

## Master and fallback hierarchy
For every format:

1. Real uploaded variant image.
2. Approved admin-managed shared master, when compatible with the dynamic renderer.
3. Bundled approved master asset.
4. Existing approved static fallback image.
5. Visible non-blocking missing-image state only if all approved sources fail.

Do not silently substitute unrelated shapes or old ampoule-style Cartridge artwork.

## Shared renderer interface
The shared renderer must expose a stable browser API similar to:

```js
window.AIBTVisualRenderer.renderPreview({
  canvas,
  masterUrl,
  productName,
  strength,
  format,
  accent,
  cartridgeBlank,
  vialCapMode: 'white'
})
```

It may return metadata such as:

```js
{
  mode: 'dynamic-preview' | 'reference-only',
  format: 'Pen' | 'Vial' | 'Cartridge',
  fallbackReason?: 'long-cartridge-name' | 'missing-blank-master' | 'load-failure'
}
```

The storefront adapter owns source resolution and fallback decisions; the renderer owns geometry, recoloring, text fit, and drawing.

## Storefront integration boundary
Do not rewrite catalog, product, cart, checkout, member, admin, or data-fetch logic. The integration point is the existing visual host path where `center-fix.js` currently decides whether to render a real image, compose a shared master, or show the Cartridge fallback.

Prefer extracting or delegating the existing composition logic from `center-fix.js` into the shared renderer while leaving its broader navigation/controller behavior untouched.

## Performance
- Master images should be loaded only when needed for the visible/selected variant.
- Reuse browser caching for repeated master URLs.
- Do not add large dependencies.
- Do not pre-generate hundreds of files in Phase 2A.
- Keep the existing image-first fallback so a render failure cannot break purchase flow.

## Error handling
- Real variant image load failure: fall back to the approved generated/static placeholder path.
- Dynamic master load/CORS failure: use the approved static fallback for that format.
- Unsupported/long Cartridge name: intentionally use the standard Cartridge reference; this is not treated as an error.
- Missing product name/strength in runtime data: use the current safe fallback rather than drawing malformed text.
- Rendering exceptions must not interrupt navigation, cart, checkout, or product selection.

## Testing and release gates
Phase 2A is not production-ready until all of the following pass on a protected preview:

### Unit/contract checks
- Pen field geometry remains unchanged.
- Vial white-cap rule remains the default.
- Vial long-name wrap remains two-line maximum.
- Vial light-color readability logic remains active.
- Cartridge short-name classifier returns dynamic mode for approved short examples.
- Cartridge long/complex-name classifier returns standard-reference mode.
- Real uploaded image priority is preserved.
- No Supabase mutations, storage uploads, schema changes, or new production writes are introduced by visual rendering.

### Storefront regression checks
Verify the preview on mobile, tablet, and desktop for:
- homepage/catalog cards;
- product detail/open-product flow;
- strength switch;
- format switch;
- add to cart;
- cart display;
- checkout entry;
- member/navigation links;
- admin entry remains unaffected;
- no new console/runtime errors;
- no broken critical assets.

### Required visual examples
At minimum render:
- GHK-CU Pen;
- Cagrilintide Pen;
- GHK-CU Vial;
- a long two-line Vial name;
- GHK-CU Cartridge dynamic;
- Cagrilintide Cartridge dynamic;
- Semaglutide + Cagrilintide Cartridge standard-reference fallback.

## Rollback
Phase 2A must be implemented in a focused preview branch. The safe rollback is to revert the storefront adapter to the existing `center-fix.js` image behavior. Rollback must not require database, storage, environment, or data changes.

## Explicit non-goals
- No bulk generation or upload of finished variant images.
- No production database changes.
- No media-template database writes.
- No new Supabase storage uploads.
- No admin redesign.
- No payment or checkout redesign.
- No merge/deploy to production merely because unit tests pass.
- No change to real uploaded variant-image priority.

## Phase 2B decision gate
After Phase 2A preview QA passes, choose separately whether to:

1. keep runtime composition as the production path; or
2. add optional caching/pre-generation for selected high-traffic variants.

Phase 2A does not implement persistent generated-image caching.
