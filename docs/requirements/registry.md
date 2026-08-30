# AI BioTech Requirements Registry

Status values: `NOT TESTED`, `IMPLEMENTING`, `TESTING`, `FAIL`, `FIXING`, `RETEST`, `PASS`, `LOCKED`, `BLOCKED`, `NEEDS OWNER`.

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| REQ-OPS-001 | Staging-first execution; production frozen until release approval | P0 | ChatGPT/GitHub/Vercel | Release gate | none | No production write before owner approval |
| REQ-OPS-002 | Backup, before-state counts and rollback before destructive work | P0 | GitHub/Supabase | Release gate | REQ-OPS-001 | Baseline + rollback docs exist and are verified |
| REQ-OPS-003 | One implementation owner per subsystem and independent tester | P0 | ChatGPT/Graph Mode | QAMap/Testifly | REQ-OPS-001 | Every P0/P1 item has owner + tester |
| REQ-VIS-001 | One authoritative product visual resolver | P0 | GitHub frontend | Testifly/visual QA | REQ-OPS-002 | No competing runtime image writer outranks resolver |
| REQ-VIS-002 | Realistic Vial master; name below logo; strength badge; exact cap/stopper masks | P0 | Frontend visual | Visual QA | REQ-VIS-001 | No overlap/fake neck band; category colors pass |
| REQ-VIS-003 | Realistic Pen master with text fitting | P0 | Frontend visual | Visual QA | REQ-VIS-001 | Name/strength remain inside approved fields |
| REQ-VIS-004 | Realistic Cartridge master only; no dynamic overlay; no cartoon fallback | P0 | Frontend visual | Visual QA | REQ-VIS-001 | Hero/card/modal/cart/checkout all show approved master |
| REQ-CAT-001 | Exact variant identity Product→Strength/Volume→Format→Variant ID→SKU→Price→Stock | P0 | Supabase/catalog | YepCode/data QA | REQ-OPS-002 | All active variants valid and traceable |
| REQ-CAT-002 | Master price-list reconciliation without inventing prices | P0 | Catalog/Supabase | Data QA | REQ-CAT-001 | Correct/Corrected/Missing/Ambiguous report complete |
| REQ-CAT-003 | Stock integrity, no negatives, reserved/available logic | P0 | Supabase/inventory | Data QA | REQ-CAT-001 | No active negative stock; stock transitions audited |
| REQ-CAT-004 | Bacteriostatic Water uses Volume; Cartridge exclusions respected | P1 | Catalog | E2E QA | REQ-CAT-001 | Selectors/variants match business rules |
| REQ-STO-001 | Clean light professional storefront | P1 | Frontend | Testifly | REQ-VIS-001 | Responsive visual baseline passes |
| REQ-STO-002 | Featured Products controlled by admin featured flag | P1 | Frontend/Supabase | E2E QA | REQ-CAT-001 | Homepage featured list matches DB |
| REQ-STO-003 | Search/filter/sort combinations work | P1 | Frontend | E2E QA | REQ-CAT-001 | Combined filters return correct results |
| REQ-STO-004 | Strength/format switches update SKU/price/stock/image | P0 | Frontend/catalog | E2E QA | REQ-CAT-001, REQ-VIS-001 | Exact selected variant displayed |
| REQ-STO-005 | Cart uses exact selected variant and correct totals/stock limits | P0 | Frontend/commerce | E2E QA | REQ-STO-004 | Cart line matches selected variant and totals |
| REQ-STO-006 | Product modal/research links/navigation close correctly | P1 | Frontend | E2E QA | REQ-STO-001 | No dead link, overflow or stuck modal |
| REQ-AUTH-001 | Registration/login/logout/forgot password/recovery | P0 | Supabase/Auth | Testifly/security QA | REQ-OPS-002 | Complete staging auth flow passes |
| REQ-AUTH-002 | super_admin/admin/agent roles enforced with RLS/RPC | P0 | Supabase/Auth | Security QA | REQ-AUTH-001 | Unauthorized actions denied server-side |
| REQ-AUTH-003 | No frontend service-role keys/secrets | P0 | Security | Static/security QA | none | Secret scan passes |
| REQ-ADM-001 | Full Super Admin modules complete | P1 | Admin/Supabase | Testifly | REQ-AUTH-002 | All required modules have working workflows |
| REQ-ADM-002 | Stock-change modal with reason/audit | P1 | Admin/inventory | E2E QA | REQ-CAT-003 | Modal triggers only on quantity change and logs action |
| REQ-ADM-003 | Mobile admin usable; save feedback explicit | P1 | Admin frontend | Visual/E2E QA | REQ-ADM-001 | Mobile forms/tables/nav pass |
| REQ-MEM-001 | Member profile/company/multiple addresses/orders/invoices/wallet/tracking/protocols | P1 | Member/Supabase | Testifly | REQ-AUTH-001 | Member area E2E passes |
| REQ-MEM-002 | Member can access only own private data | P0 | Supabase/RLS | Security QA | REQ-AUTH-002 | Cross-account tests denied |
| REQ-WAL-001 | RM1=1 point where approved; full wallet ledger | P1 | Supabase/commerce | Data/E2E QA | REQ-MEM-001 | Credits/debits reconcile and audit |
| REQ-PAY-001 | ToyyibPay sandbox/live environment-safe | P0 | Payment backend | Integration QA | REQ-AUTH-003 | No staging test can create unintended production payment |
| REQ-ORD-001 | Exact cart→order lifecycle | P0 | Commerce/Supabase | E2E QA | REQ-STO-005, REQ-PAY-001 | Order preserves exact variants/totals |
| REQ-INV-001 | Invoice generation and member/admin download | P1 | Orders/invoices | E2E QA | REQ-ORD-001 | Invoice equals order totals |
| REQ-SHIP-001 | EasyParcel integration as fulfilment layer | P0 | Shipping backend | YepCode/integration QA | REQ-ORD-001 | Rate/shipment/AWB/tracking workflow works in safe mode |
| REQ-SHIP-002 | Prefer SPX when supported; J&T/DHL alternatives; no auto-GDEX | P1 | Shipping backend | Integration QA | REQ-SHIP-001 | Courier-selection rules verified |
| REQ-SHIP-003 | Generate/download/print waybill and sync tracking/member view | P1 | Shipping/admin/member | E2E QA | REQ-SHIP-001 | Waybill/tracking persist and member sees status |
| REQ-SHIP-004 | Never mark Shipped before valid shipment/tracking exists | P0 | Shipping/orders | E2E QA | REQ-SHIP-001 | Invalid transition is blocked |
| REQ-RES-001 | Research Center maps every active compound correctly | P1 | Research/Supabase | E2E QA | REQ-CAT-001 | No broken compound mapping |
| REQ-RAG-001 | Research/AI retrieval grounded and evaluated | P1 | RAGOps/research | RAG QA | REQ-RES-001 | Grounding/miss/hallucination suite passes |
| REQ-AI-001 | Peptide assistant multilingual/friendly and grounded | P1 | AI assistant | RAG QA | REQ-RAG-001 | Approved-data/source responses pass evaluation |
| REQ-AI-002 | AI Center can assist but cannot silently perform destructive/financial writes | P0 | AI/admin | Guardrail QA | REQ-AUTH-002 | Approval gate blocks silent critical writes |
| REQ-PRO-001 | Protocol entitlement exact product+strength+format+order | P0 | Protocol/Supabase | E2E/security QA | REQ-ORD-001 | Non-entitled access denied |
| REQ-PRO-002 | Vial/Pen/Cartridge protocol awareness and admin approval | P1 | Protocol | E2E QA | REQ-PRO-001 | Correct format content and approval workflow |
| REQ-PRO-003 | One-page A4 target and locked dose/timing sequence unless audited override | P1 | Protocol/PDF | PDF QA | REQ-PRO-002 | PDF/layout and lock rules pass |
| REQ-COM-001 | Email flows for recovery/order/tracking/protocol/invoice with safe secrets | P1 | Backend/email | Integration QA | REQ-AUTH-003 | Staging notifications test without secret exposure |
| REQ-SET-001 | Store settings, maintenance mode/passcode, free-shipping threshold | P1 | Admin/settings | E2E QA | REQ-ADM-001 | Settings persist and maintenance bypass works |
| REQ-ANA-001 | Affiliate/referral + privacy-conscious analytics | P2 | Analytics | Privacy QA | REQ-SET-001 | Tracking is disclosed/configurable and admin-only |
| REQ-LOG-001 | Audit logs and system logs meaningful and searchable | P1 | Supabase/admin | Data QA | REQ-ADM-001 | Sample actions/errors produce attributable records |
| REQ-REP-001 | Reports and customer export | P1 | Admin/reporting | Data QA | REQ-LOG-001 | Report totals reconcile with DB |
| REQ-SEC-001 | RLS/storage/upload/security/environment separation | P0 | Supabase/security | Security QA | REQ-AUTH-002 | Security matrix passes |
| REQ-SEC-002 | Static analysis, dependency/security and secret scans | P0 | Engineering guardrails | Sonar/Endor role | none | No unresolved release-blocking finding |
| REQ-QA-001 | Independent E2E/mobile/desktop/visual/network/accessibility/performance QA | P0 | QA team | Release manager | all P0/P1 deps | No P0/P1 failure remains |
| REQ-REL-001 | Release candidate with evidence, rollback and one final owner approval | P0 | ChatGPT/GitHub/Vercel | Owner | REQ-QA-001 | Owner approves frozen RC before production |
