# AI BioTech QA Matrix

This file maps release-critical requirements to evidence targets. Status starts `NOT TESTED` unless explicitly recorded otherwise.

| Requirement | Test/Evidence | Owner | Status |
|---|---|---|---|
| REQ-OPS-001 | Verify staging-only target and production freeze | Release manager | PASS |
| REQ-OPS-002 | Baseline counts + rollback docs | GitHub/Supabase | IMPLEMENTING |
| REQ-VIS-001 | Resolver unit tests + first-paint browser check | Frontend QA | NOT TESTED |
| REQ-VIS-002 | Vial visual regression across category colors/viewports | Visual QA | NOT TESTED |
| REQ-VIS-003 | Pen long-name/strength fit visual test | Visual QA | NOT TESTED |
| REQ-VIS-004 | Cartridge hero/card/modal/cart/checkout visual test | Visual QA | NOT TESTED |
| REQ-CAT-001 | Full variant export integrity check | Data QA | NOT TESTED |
| REQ-CAT-002 | Master price-list reconciliation report | Data QA | NOT TESTED |
| REQ-CAT-003 | Negative/reserved/available stock validation | Data QA | NOT TESTED |
| REQ-STO-004 | Strength/format switch E2E | Browser QA | NOT TESTED |
| REQ-STO-005 | Exact selected variant/cart total E2E | Browser QA | NOT TESTED |
| REQ-AUTH-001 | Register/login/logout/recovery E2E | Browser QA | NOT TESTED |
| REQ-AUTH-002 | Role/RLS matrix | Security QA | NOT TESTED |
| REQ-AUTH-003 | Secret scan/frontend key review | Security QA | NOT TESTED |
| REQ-ADM-001 | Required admin modules workflow suite | Browser QA | NOT TESTED |
| REQ-MEM-002 | Cross-account access denial | Security QA | NOT TESTED |
| REQ-PAY-001 | Staging ToyyibPay environment isolation | Integration QA | NOT TESTED |
| REQ-ORD-001 | Cart→payment→order exact variant fixture | E2E QA | NOT TESTED |
| REQ-INV-001 | Invoice totals/order linkage fixture | E2E QA | NOT TESTED |
| REQ-SHIP-001 | EasyParcel safe-mode rate/shipment/AWB integration | Integration QA | NOT TESTED |
| REQ-SHIP-004 | Prevent Shipped without tracking/shipment | E2E QA | NOT TESTED |
| REQ-RAG-001 | Retrieval grounding/hallucination suite | RAG QA | NOT TESTED |
| REQ-AI-002 | Critical-write approval guardrail tests | Guardrail QA | NOT TESTED |
| REQ-PRO-001 | Exact entitlement allow/deny tests | Security/E2E QA | NOT TESTED |
| REQ-SEC-001 | RLS/storage/environment security matrix | Security QA | NOT TESTED |
| REQ-SEC-002 | Static/dependency/secret scans | Security QA | NOT TESTED |
| REQ-QA-001 | Full viewport, accessibility, network, console, performance suite | QA lead | NOT TESTED |
| REQ-REL-001 | Frozen RC evidence package + owner approval | Release manager | NOT TESTED |

## Required viewport set
- 360×800
- 390×844
- 412×915
- 768×1024
- 1366×768
- 1440×900

## Release rule
No P0/P1 requirement may remain `FAIL`, `FIXING`, `RETEST`, `BLOCKED`, `NOT TESTED` or `NEEDS OWNER` at release, except an explicitly owner-approved documented exception that does not undermine safety or data integrity.
