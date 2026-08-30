# AI BioTech Product Visual Pipeline Audit

## Executive finding

The review storefront currently has multiple independent visual writers. They can overwrite one another after initial render, which explains old/cartoon Cartridge assets, broken masters, Vial overlays and cache-dependent behavior.

The fix is not another CSS patch. WP-03 must implement one pure resolver and one renderer, remove competing writers from active pages and test first paint as well as steady state.

## Current data sources

### `clean-store.js`

- Reads products/categories/research from `window.AIBT_CONFIG`, which points to `rpnw...`.
- Defines a hard-coded `MASTER` object whose Vial/Pen/Cartridge URLs are hosted by `yjaux...`.
- `imageFor(v)` currently returns `v.image_url || MASTER[v.format] || MASTER.Vial`.
- This gives any legacy `variants.image_url` silent priority over approved format masters.
- It sets images for product cards, hero, cart and product modal.
- It also emits a `.dynamic-label` product name/strength layer.

### `uploaded-master-renderer.js`

- Creates another Supabase client using hard-coded `yjaux...` credentials.
- Fetches `media_templates` after the page renders.
- Uses a `MutationObserver` to repeatedly replace image `src` attributes.
- Creates another `.master-dynamic-layer` for Vial/Pen and removes it for Cartridge.
- The delayed fetch means the old image can display before the new image arrives.

### `storefront-visual-fix.js`

- Independently rewrites Cartridge images in hero, cards, modal and cart.
- Contains its own Cartridge asset constant.
- Uses mutation observers/timeouts and can race the base storefront and uploaded-master renderer.
- Wraps modal images into a second visual container and inserts another label layer.

### `vial-layered-renderer.js`

- Remains in the repository as an alternate generated Vial renderer.
- Even when not loaded by the current `index.html`, it is a legacy source that must not be reintroduced accidentally.

### CSS writers

The following files overlap responsibility for image framing, labels, format-specific positioning or colour accents:

- `clean-store.css`
- `storefront-visual-fix.css`
- `mobile-product-reference-fix.css`
- `uploaded-master-renderer.css`
- `category-visual-accent.css`
- `storefront-polish-20260830.css`
- `storefront-mobile-final-20260830.css`
- `responsive-hardening.css`

This layering makes it difficult to know which selector wins on each viewport and encourages additional `!important` patches.

### Dynamic loaders

`staging-config.js` dynamically injects additional storefront polish, research coverage, badge and hero scripts after page load. `hero-final-20260830.js` is another potential hero writer. Any dynamic loader must be audited before declaring the hero/master pipeline stable.

### Media records

- `rpnw...media_templates` exists but currently references cross-project `yjaux...` asset URLs.
- `rpnw...` has no Storage objects.
- `yjaux...media_templates` and `catalog-media` hold several historical master versions.
- Temporary uploader/admin media flows currently target `yjaux...`, not the authoritative staging project.

## Observed failure modes

1. Correct Cartridge appears in Supabase but old/cartoon asset remains on card.
2. New source is applied only after first paint, causing visual flash.
3. Another observer restores an older source.
4. Cached script retains old hard-coded asset URL.
5. Vial colour patches overlay glass/neck instead of precise cap/stopper regions.
6. Product name/strength layers are inserted by more than one script.
7. Hero, card, modal and cart can use different sources.
8. A broken SVG/MIME/host path produces an empty or broken-image state.
9. Legacy `variant.image_url` can silently override format masters without approval metadata.

## Authoritative resolver contract

WP-03 must expose one pure function:

```js
resolveProductVisual({
  product,
  variant,
  format,
  context,
  activeMasters,
  approvedOverrides
})
```

It returns a normalized object:

```js
{
  format,
  sourceUrl,
  sourceType,        // approved_override | format_master | neutral_fallback
  version,
  cacheKey,
  alt,
  overlayMode,       // vial | pen | none
  categoryColor,
  diagnostics
}
```

## Priority rules

1. **Approved custom override** only when the selected exact variant has a dedicated approval flag/record and a valid image.
2. **Active format master** from the authoritative staging `media_templates` record.
3. **Neutral fallback** that clearly indicates missing media; never an old/cartoon product image.

A raw non-empty `variant.image_url` is not sufficient proof of approval.

## Rendering rules

- Resolve before building the card/modal/cart markup.
- Do not use mutation observers to fight other image writers.
- Do not display legacy master before an async replacement. Show skeleton until product+master data are ready.
- Hero, card, modal, cart and checkout call the same resolver.
- Image `srcset` may be used only when generated from the same resolved master/version.
- Cache key uses active master version/hash, not arbitrary timestamps on every render.
- Store the resolved source identifier with cart display metadata, but re-resolve/revalidate at checkout.
- Broken-image handler may switch only to neutral fallback and record diagnostics.

## Overlay rules

### Vial

- One real master.
- Product name below logo/tagline within approved field.
- Strength in separate category-coloured badge.
- Cap/stopper colouring uses precise assets/masks derived from the real master.
- Silver ring, glass, reflections and powder unchanged.

### Pen

- Product name inside long orange field.
- Strength inside white field.
- Auto-fit function reduces font size within safe bounds; no overflow.

### Cartridge

- No dynamic product or strength overlay.
- Exact selected product/strength remains visible in card controls/details.

## Files to retire from active runtime

The following should be removed from active `index.html` or reduced to non-conflicting utilities once the resolver is ready:

- `uploaded-master-renderer.js`
- `storefront-visual-fix.js` image-rewriting behavior
- `vial-layered-renderer.js`
- format-specific image/label behavior in `clean-store.js`
- redundant label/format positioning rules in overlapping CSS files

Retirement must be staged after resolver tests pass; files may remain in Git history for rollback.

## Tests required before replacement

### Unit tests

- Approved override outranks format master.
- Unapproved `variant.image_url` does not outrank master.
- Missing override uses active format master.
- Missing master uses neutral fallback.
- Cartridge returns `overlayMode: none`.
- Vial/Pen return correct overlay mode.
- Cache key changes with master version and remains stable otherwise.
- Invalid/unsafe URL fails closed.
- Exact selected variant supplies alt/format/category data.

### Integration/browser tests

- Initial HTML/first visible frame does not show a legacy/cartoon asset.
- Hero/card/modal/cart/checkout use identical resolved source/version.
- Switching strength/format updates source and overlays once.
- Broken master produces neutral fallback, not infinite mutation loop.
- No repeated image network requests caused by observer contention.
- Six+ category colours and target viewports pass.

## Completion condition

The visual pipeline is not complete until repository search and browser instrumentation prove:

- one active resolver;
- zero active competing image writers;
- zero cross-project runtime master reads;
- no old/cartoon first paint;
- no broken master asset;
- consistent source/version in hero/card/modal/cart/checkout;
- Vial/Pen/Cartridge visual acceptance tests pass.