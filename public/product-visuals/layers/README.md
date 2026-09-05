# AI BioTech Product Visual Layers

Branch-ready structure for the AI BioTech reusable visual layer system.

## Folder structure

- `base/` — permanent Pen/Vial master bodies
- `templates/` — reusable category-colour overlays
- `names/` — product-name overlays
- `strengths/` — reusable strength overlays
- `aibiotech-full-layer-manifest.json` — package manifest

## Stacking order

1. Base master
2. Category template
3. Product name layer
4. Strength layer

All assets are intended to use the same 1:1 full canvas and transparent alpha background so they can be stacked at 100% scale, X=0, Y=0.

## Suggested repository destination

`public/product-visuals/layers/`

Upload this folder to the review branch first, then verify visual alignment in staging before any production promotion.
