# AI BioTech Preview-Only Product Visual Composer — Design

## Purpose
Build a standalone preview-only Product Visual Composer for AI BioTech so Vial, Pen, and Cartridge visuals can be validated before any storefront integration or production image/data changes.

## Safety boundary
Phase 1 is read-only with respect to production systems. It must not write product records, variant records, media template records, Supabase storage, RLS, Auth, schema, migrations, secrets, payment settings, DNS, or production image URLs. It must not alter the live storefront rendering path.

## Architecture
The composer is a separate page (`visual-composer.html`) using a dedicated shared renderer (`visual-renderer.js`) and page controller (`visual-composer.js`). The renderer accepts plain data: product name, strength, format, accent color, and a master image URL; it returns a 1536×1536 canvas preview. The page can optionally read the existing published product/variant catalog and existing public master URLs, but all preview selections and QA status remain in-memory/local only.

## Rendering rules
- Canvas output is always 1536×1536 with transparent canvas background unless the master itself contains a background.
- Product name and strength are never baked into reusable blank masters.
- Text must fit inside fixed print fields. Longer names such as `CAGRILINTIDE` automatically shrink; short names such as `GHK-CU` may render larger. Text is centered optically and clipped to its print field.
- Pen reuses the existing fixed field geometry from `center-fix.js`:
  - name: x=720, y=674, w=362, h=122, pad=18, max=44, min=16, weight=900
  - strength: x=1128, y=680, w=126, h=118, pad=12, max=28, min=14, weight=900
- Vial reuses the current optical name/strength anchors from `center-fix.js`: name centered at x=768,y=820,maxWidth=430; strength centered at x=768,y=977,maxWidth=230.
- Category/accent color is applied using the same recoloring/tint behavior already used by the storefront renderer where the helper is available.
- Cartridge remains preview-only and may use the current approved/admin master without dynamic label overlays until a verified blank Cartridge master is available. The UI must explicitly label this limitation.

## UI
The page contains:
- Product selector (optional live read-only catalog source) plus manual product-name input.
- Strength input.
- Format selector: Vial / Pen / Cartridge.
- Accent color input with a small set of category presets.
- Master source display.
- 1:1 preview canvas.
- Metadata panel showing product, strength, format, accent, template source, and render mode.
- Local QA status: Draft / Looks Good / Needs Adjustment. Status is not persisted to production or Supabase.
- Reset and Render buttons.

## Error handling
- Missing master: show a clear non-destructive error; do not fallback to production writes or hidden substitutes.
- CORS/image-load error: show the source URL and error state; do not save anything.
- Empty product name or strength: render is blocked with inline validation.
- Cartridge: if only a printed master is available, show it as reference-only and state that dynamic product/strength injection is disabled for Cartridge in Phase 1.

## Testing
- Unit/contract test proves `fitTextToField` chooses a smaller font for `CAGRILINTIDE` than `GHK-CU` under the same field dimensions and never goes below minimum size.
- Contract test proves Pen and Vial field coordinates are stable.
- Contract test proves the composer source contains no Supabase `.insert`, `.update`, `.upsert`, `.delete`, storage upload, or fetch calls to project mutation endpoints.
- Contract test proves Cartridge is reference-only unless a blank-master flag is supplied.
- Existing site smoke workflow must remain green.
- Vercel preview must be manually checked on mobile, tablet, and desktop before any future Phase 2 integration.

## Phase 2 decision gate
After Phase 1 QA passes, choose separately between:
1. runtime storefront composition, or
2. generating/caching finished variant images.

Phase 1 does not make that choice and does not embed the composer into production storefront behavior.
