# AI BioTech Supabase Baseline — 2026-08-30

## Safety classification

This document is read-only baseline evidence. It does not authorize writes, reseeding, migration merging or data deletion.

Two Supabase projects exist and are both healthy:

| Project ID | Project name | Region | Observed role |
|---|---|---|---|
| `rpnwssqvurpdennpzplx` | `AI BioTech Staging` | `ap-south-1` | Intended isolated staging service/data project; used by `staging-config.js` |
| `yjauxyvtrmdriwtmckkl` | `Ai BioTech Project` | `ap-south-1` | Legacy/full operational project containing live-like orders, customers, invoices, protocols, audit history and media storage; treat as protected until formally classified |

## P0 environment-split finding

The review branch is not yet using a single backend consistently:

- `staging-config.js` points storefront catalog queries to `rpnwssqvurpdennpzplx`.
- Existing admin and some master-renderer/upload code still hard-code `yjauxyvtrmdriwtmckkl`.
- `rpnwssqvurpdennpzplx.media_templates` currently references assets hosted in `yjauxyvtrmdriwtmckkl`.
- `rpnwssqvurpdennpzplx` currently has no Storage objects.

Until WP-02 establishes a single environment contract, no new operational writes should be made through mixed-project code paths.

## Project `rpnwssqvurpdennpzplx` row-count baseline

| Table | Rows |
|---|---:|
| categories | 9 |
| products | 39 |
| variants | 224 |
| research_entries | 39 |
| admin_users | 1 |
| change_batches | 4 |
| change_items | 4 |
| site_control | 1 |
| content_pages | 5 |
| menu_items | 6 |
| media_templates | 3 |
| feature_modules | 11 |
| integration_configs | 6 |
| customer_profiles | 1 |
| addresses | 1 |
| wallet_accounts | 1 |
| vouchers | 0 |
| orders | 1 |
| order_items | 1 |
| wallet_transactions | 0 |
| voucher_redemptions | 0 |
| payments | 1 |
| shipments | 1 |
| invoices | 1 |
| commerce_settings | 1 |
| protocol_sources | 0 |
| protocol_configurations | 0 |
| protocol_versions | 0 |
| customer_protocols | 0 |
| pricing_rules | 0 |
| agent_profiles | 0 |
| agent_commissions | 0 |
| agent_referrals | 0 |
| wallet_topup_intents | 0 |
| shipping_rate_quotes | 0 |
| automation_rules | 0 |
| automation_runs | 0 |
| recovery_snapshots | 0 |
| public_feature_flags | 1 |
| research_source_registry | 5 |

RLS is enabled on all listed public tables. Forty-one public-schema policies were observed. The project contains staging-specific migrations for safe change batches, commerce, roles, wallet top-up intents, EasyParcel adapter contracts, agent/referral flows, automation dry-runs and logical recovery snapshots.

### `rpnwssqvurpdennpzplx` migrations

1. `20260829095418 staging_catalog_core`
2. `20260829095546 enable_http_for_staging_catalog_sync`
3. `20260829100230 staging_public_research_insights`
4. `20260829101404 staging_operations_service_foundation`
5. `20260829101806 staging_batch_undo_with_conflict_guard`
6. `20260829102925 operations_content_theme_feature_control`
7. `20260829103710 enable_read_plan_ai_control_center`
8. `20260829104452 staging_commerce_service_layer`
9. `20260829104540 staging_commerce_admin_operations`
10. `20260829104950 harden_staging_commerce_table_privileges`
11. `20260829105213 staging_private_protocol_entitlements`
12. `20260829105713 hide_new_privileged_service_implementations`
13. `20260829105756 hide_legacy_staging_ops_implementations`
14. `20260829105831 optimize_staging_rls_and_foreign_key_indexes`
15. `20260829110533 staging_role_and_quantity_pricing`
16. `20260829110555 staging_admin_price_preview`
17. `20260829112227 add_agent_referral_and_dashboard_contracts`
18. `20260829112435 add_wallet_topup_intent_contracts_v2`
19. `20260829112526 add_member_wallet_topup_status`
20. `20260829112845 add_easyparcel_shipping_adapter_contracts`
21. `20260829113453 align_integration_readiness_to_healthy_status`
22. `20260829114002 add_agent_dropship_order_channel`
23. `20260829114407 add_safe_automation_builder_and_dry_runs`
24. `20260829115239 add_safe_logical_recovery_snapshots`
25. `20260829121154 add_staging_admin_access_rpc`
26. `20260829121224 fix_admin_users_rls_self_read`
27. `20260829121523 grant_authenticated_admin_policy_helper`
28. `20260829161100 ai_storefront_assistant`
29. `20260829161921 harden_ai_assistant_public_flag`
30. `20260829182357 add_private_research_source_registry`

### `rpnwssqvurpdennpzplx` active master records

| Format | Version | URL source |
|---|---:|---|
| Cartridge | 1 | Cross-project URL hosted by `yjauxyvtrmdriwtmckkl` |
| Pen | 1 | Cross-project URL hosted by `yjauxyvtrmdriwtmckkl` |
| Vial | 1 | Cross-project URL hosted by `yjauxyvtrmdriwtmckkl` |

Storage object count observed: `0`.

Security advisor finding: leaked-password protection is disabled.

## Project `yjauxyvtrmdriwtmckkl` row-count baseline

| Table | Rows |
|---|---:|
| admin_users | 2 |
| categories | 9 |
| products | 39 |
| product_images | 0 |
| variants | 224 |
| customer_profiles | 3 |
| addresses | 0 |
| vouchers | 0 |
| orders | 4 |
| order_items | 4 |
| order_events | 22 |
| payments | 0 |
| wallet_accounts | 3 |
| wallet_transactions | 0 |
| shipments | 2 |
| invoices | 6 |
| voucher_redemptions | 0 |
| pages | 8 |
| research_entries | 39 |
| media_assets | 3 |
| store_settings | 4 |
| inventory_adjustments | 152 |
| audit_logs | 460 |
| system_logs | 0 |
| stores | 1 |
| protocol_sources | 5 |
| protocol_configurations | 9 |
| protocol_versions | 5 |
| customer_protocols | 4 |
| media_templates | 3 |

RLS is enabled on all listed public tables. Fifty-three public-schema policies were observed.

### `yjauxyvtrmdriwtmckkl` active master records

| Format | Version | Current URL |
|---|---:|---|
| Cartridge | 5 | Review-branch Vercel SVG URL |
| Pen | 3 | `catalog-media/masters/staging/pen-master-v3-...png` |
| Vial | 3 | `catalog-media/masters/staging/vial-master-v3-...png` |

### `catalog-media` storage baseline

Eleven objects were observed:

- `masters/cartridge-master`
- `masters/pen-master`
- `masters/vial-master`
- `masters/staging/cartridge-master-v2-...png`
- `masters/staging/cartridge-master-v3-...png`
- `masters/staging/cartridge-master-v4-...png`
- `masters/staging/cartridge-master-v5-...png`
- `masters/staging/pen-master-v2-...png`
- `masters/staging/pen-master-v3-...png`
- `masters/staging/vial-master-v2-...png`
- `masters/staging/vial-master-v3-...png`

### `yjauxyvtrmdriwtmckkl` migrations

1. `20260827165455 phase1_operational_integrity`
2. `20260827165555 phase1_server_shipping_integrity`
3. `20260827165852 fix_paid_invoice_prefix`
4. `20260827165947 fix_archive_wrapper_permissions`
5. `20260827170117 harden_public_rpc_wrappers`
6. `20260827180530 unified_product_editor`
7. `20260827185022 shipping_wallet_content_repair`
8. `20260828031540 verified_protocol_engine`
9. `20260828031625 protocol_engine_indexes`
10. `20260828034532 customer_protocol_management`
11. `20260828035303 authorize_protonmail_super_admin`
12. `20260828043211 protocol_review_preview`
13. `20260828045232 protocol_category_pdf`
14. `20260828052550 seed_initial_verified_protocol_references`
15. `20260828062630 fix_protocol_push_permissions`
16. `20260828062729 fix_protocol_status_enum`
17. `20260828144825 backup_master_price_update_20260828`
18. `20260828155230 product_save_blank_numeric_fix`
19. `20260828172159 backup_before_cartridge_variants_20260828`
20. `20260828172325 add_cartridge_variants_from_master_price_list`
21. `20260828174615 catalog_media_storage`
22. `20260830005552 add_media_templates_for_staging_master_upload`
23. `20260830023853 allow_public_read_media_templates`

Security advisor findings:

- Signed-in users can execute the `SECURITY DEFINER` function `public.admin_generate_customer_protocol(...)`; verify/restrict intended roles before release.
- Leaked-password protection is disabled.

## Baseline rule

Until WP-02 passes, treat both Supabase projects as protected and allow only read-only inspection plus explicitly reviewed staging-safe changes. The preferred end state is one documented staging project used consistently by storefront, admin, serverless APIs and tests, with no hidden cross-project writes.