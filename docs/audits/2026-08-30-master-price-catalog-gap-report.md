# AI BioTech Master Price & Catalog Gap Report

**Date:** 2026-08-30  
**Work package:** WP-04 Catalog, Price & Stock Integrity  
**Environment:** Authoritative staging only  
**Supabase project:** `rpnwssqvurpdennpzplx`  
**Price source:** `AI_BioTech_Master_Price_List (2).pdf`  
**Change mode:** READ ONLY — no price, stock, product or variant update was performed.

## Executive result

| Result | Count |
|---|---:|
| Exact unambiguous matches | **199** |
| Price mismatches | **0** |
| PDF variants missing from staging | **0** |
| Ambiguous PDF keys | **3** |
| Active staging variants not governed by this PDF | **22** |

The active staging catalog already matches every unambiguous product/strength/format price represented in the current master price PDF. No automatic price overwrite is justified.

## Decision rule

No row in the ambiguous or staging-only sections may be modified automatically. These rows require an approved source or an explicit owner decision. Existing product IDs, variant IDs, SKUs, order history, stock records and relationships must be preserved.

## Ambiguous PDF prices — owner/source decision required

The PDF contains both a standard NAD+ table and a separate `NAD+ VIAL ONLY` table for the same three Vial keys.

| Product | Strength | Format | Current staging | Values in PDF | Status |
|---|---:|---|---:|---:|---|
| NAD+ | 100mg | Vial | RM110 | RM70, RM110 | `AMBIGUOUS_PDF` |
| NAD+ | 500mg | Vial | RM160 | RM100, RM160 | `AMBIGUOUS_PDF` |
| NAD+ | 1000mg | Vial | RM190 | RM140, RM190 | `AMBIGUOUS_PDF` |

**Safe treatment:** retain current staging values until the intended table is confirmed. Do not choose the lower or higher value by inference.

## Active staging variants not represented in the PDF

These are not automatically wrong. They are catalog gaps requiring classification as approved extension, outdated entry, unsupported format, or missing price-source row.

| # | Product | Strength | Format | Current price | Required decision |
|---:|---|---:|---|---:|---|
| 1 | AOD-9604 | 5mg | Cartridge | RM150 | Likely conflicts with the stated Cartridge exclusion; verify and archive safely if confirmed. |
| 2 | AOD-9604 | 5mg | Pen | RM180 | PDF supplies Vial only; verify whether Pen is intentionally unavailable. |
| 3 | AOD-9604 | 10mg | Cartridge | RM220 | Likely conflicts with the stated Cartridge exclusion; verify and archive safely if confirmed. |
| 4 | AOD-9604 | 10mg | Pen | RM250 | PDF supplies Vial only; verify whether Pen is intentionally unavailable. |
| 5 | ARA-290 | 10mg | Vial | RM130 | Product absent from current PDF; retain until an approved source is supplied. |
| 6 | ARA-290 | 10mg | Cartridge | RM170 | Product absent from current PDF; retain until an approved source is supplied. |
| 7 | ARA-290 | 10mg | Pen | RM200 | Product absent from current PDF; retain until an approved source is supplied. |
| 8 | ARA-290 | 50mg | Vial | RM280 | Product absent from current PDF; retain until an approved source is supplied. |
| 9 | ARA-290 | 50mg | Cartridge | RM320 | Product absent from current PDF; retain until an approved source is supplied. |
| 10 | ARA-290 | 50mg | Pen | RM350 | Product absent from current PDF; retain until an approved source is supplied. |
| 11 | Bacteriostatic Water | 10mL | Bottle | RM30 | PDF lists 3mL only; 10mL was previously requested, so retain pending source confirmation. |
| 12 | Retatrutide | 40mg | Pen | RM670 | PDF does not offer Pen at this strength; verify feasibility/availability. |
| 13 | Retatrutide | 50mg | Pen | RM770 | PDF does not offer Pen at this strength; verify feasibility/availability. |
| 14 | Retatrutide | 60mg | Pen | RM870 | PDF does not offer Pen at this strength; verify feasibility/availability. |
| 15 | Retatrutide | 70mg | Vial | RM860 | Strength absent from current PDF; retain pending source confirmation. |
| 16 | Retatrutide | 70mg | Cartridge | RM900 | Strength absent from current PDF; retain pending source confirmation. |
| 17 | Retatrutide | 70mg | Pen | RM930 | Strength absent from current PDF; verify both source and Pen feasibility. |
| 18 | Retatrutide | 80mg | Vial | RM920 | Strength absent from current PDF; retain pending source confirmation. |
| 19 | Retatrutide | 80mg | Cartridge | RM960 | Strength absent from current PDF; retain pending source confirmation. |
| 20 | Retatrutide | 80mg | Pen | RM990 | Strength absent from current PDF; verify both source and Pen feasibility. |
| 21 | Retatrutide | 100mg | Vial | RM1100 | Strength absent from current PDF; retain pending source confirmation. |
| 22 | Retatrutide | 100mg | Cartridge | RM1140 | Strength absent from current PDF; retain pending source confirmation. |

## Confirmed exact-match coverage

The audit matched on the normalized key:

`product_id + strength_label + format`

For all 199 unambiguous rows:

- Staging variant exists.
- Staging price equals the PDF price.
- No expected PDF variant is missing from staging.
- No price correction is required.

This includes the PDF’s explicit Vial/Cartridge/Pen combinations and Bacteriostatic Water 3mL mapped to the database’s Bottle format.

## Stock observation

The audited active variants currently report stock quantity `50` and reserved quantity `0` in the returned comparison dataset. This report does not assume that `50` should be re-applied. A separate inventory-integrity gate must verify current operational stock before any future bulk update.

## Required next actions

1. Run the wider catalog-integrity checks for duplicate/missing SKU, duplicate normalized variants, non-positive prices, negative stock, reserved stock exceeding stock, unsupported format/unit and products without active variants.
2. Confirm the three NAD+ Vial prices against the intended governing table.
3. Decide whether AOD-9604 must remain Vial-only and archive unsupported formats non-destructively if confirmed.
4. Obtain an approved source for ARA-290 and the staging-only Retatrutide strengths/formats.
5. Retain Bacteriostatic Water 10mL until its intended price/source is confirmed.
6. Build a proposed change set with before-state, after-state, affected IDs and rollback SQL. Do not apply it until approved.

## Release gate

WP-04 remains **AUDIT / NEEDS SOURCE DECISIONS**. It is not blocked from further read-only validation, but no ambiguous or staging-only catalog row may be automatically modified.
