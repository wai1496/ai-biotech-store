# AI BioTech Professional Team Roles and Authority

## Operating rule

Every requirement has one implementation owner, one independent tester and one release gate. Specialists may review another owner's work, but they must not create competing implementations or silently overwrite another subsystem.

## Current callable workers in this session

| Worker | Authority | Job |
|---|---|---|
| ChatGPT / Master Coordinator | Program-level | Own requirements, priorities, dependency decisions, work-package status, conflict resolution and final evidence package. |
| GitHub | Source of truth | Own branch, code, docs, issues, commits, migration files, test artifacts and rollback references. |
| Vercel | Deployment/runtime | Own review deployment, build logs, runtime logs, preview environment and controlled production promotion after approval. |
| Supabase | Data/Auth/Storage | Own Postgres schema/data, Auth, RLS, Storage, RPCs, migrations, catalog, members, orders, wallet, shipping records and protocols. |
| Testifly | Independent browser QA | Own staging browser validation, interaction tests, responsive checks and release-facing UI evidence when invoked. |
| YepCode | Integration automation | Own custom API/data test scripts, reconciliation jobs and safe third-party integration probes when invoked. |
| Tavily AI | Current external research | Own current vendor/API documentation discovery, EasyParcel/SPX verification and research-source discovery. |
| Visualize / image tools | Visual specification | Own diagrams, design comparisons and approved asset preparation; cannot change backend/business data. |

## Methodologies and logical roles

| Role | Authority | Job |
|---|---|---|
| Superpowers | Engineering method | Enforce design approval, written plans, TDD, systematic debugging and verification before completion. |
| Graph Mode | Dependency governance | Prevent downstream PASS when upstream dependencies remain FAIL/BLOCKED/NOT TESTED. |
| QAMap | Requirements-to-test registry | Map every `REQ-*` to tests, evidence, defect, fix commit and retest state. Implemented in repository documents until a callable QAMap connector exists. |
| Codex Engineering Guardrails | Change control | Prevent unscoped/destructive edits, require tests and preserve staging/production separation. Implemented as repository rules/checklists until callable tooling exists. |
| RAGOps | AI/RAG evaluation | Evaluate grounding, retrieval misses, source quality and hallucination resistance. Implemented through test fixtures until callable tooling exists. |
| Release Manager | Release gate | Freeze candidate, validate evidence, confirm rollback and request one final owner approval. Coordinated by ChatGPT through GitHub/Vercel/Supabase. |

## Requested specialists not currently callable here

The following remain reserved roles. They must not be reported as having executed work unless their connectors become available:

- Kora
- Webcmd
- SonarQube
- Endor Labs Agent Kit
- Duende Skills
- get-fable
- ShipFrame
- Testing React Native Apps

Their intended assignments are:

| Specialist | Reserved assignment |
|---|---|
| Kora | Non-overlapping specialist work after capabilities are known. |
| Webcmd | Browser/command automation and debugging. |
| SonarQube | Static analysis, duplication, reliability, maintainability and security hotspots. |
| Endor Labs Agent Kit | Dependency and software-supply-chain risk. |
| Duende Skills | Identity/OIDC expertise only if Duende technology is actually adopted. |
| get-fable | UI/visual refinement only. |
| ShipFrame | Shipping-domain review supporting EasyParcel/SPX, not a competing fulfilment database. |
| Testing React Native Apps | Native-app QA only if a React Native application is later added; not required for the responsive website. |

## Work-package ownership

| Work package | Implementation owner | Independent tester/reviewer |
|---|---|---|
| WP-00 Safety baseline | GitHub + Supabase + Vercel | Release Manager |
| WP-01 Requirements/graph | ChatGPT + GitHub | QAMap role |
| WP-02 Environment/architecture cleanup | GitHub frontend/backend | Supabase review + Testifly |
| WP-03 Product visuals | GitHub visual implementation | Visual QA + Testifly |
| WP-04 Catalog/price/stock | Supabase | YepCode/data QA |
| WP-05 Storefront | GitHub frontend + Vercel | Testifly |
| WP-06 Super Admin | GitHub + Supabase | Testifly + security QA |
| WP-07 Authentication/RLS | Supabase | Testifly + security QA |
| WP-08 Member Area | GitHub + Supabase | Testifly |
| WP-09 Wallet/checkout/payment | Supabase + Vercel server APIs | YepCode + Testifly |
| WP-10 Orders/invoices | Supabase + GitHub | YepCode + Testifly |
| WP-11 EasyParcel/SPX | Vercel server APIs + Supabase | YepCode + Testifly |
| WP-12 Research/RAG | Supabase + GitHub + Tavily | RAGOps role + Testifly |
| WP-13 Protocols/PDF | Supabase + GitHub | PDF/E2E/security QA |
| WP-14 AI Center | GitHub/Vercel AI APIs | Guardrail + RAG QA |
| WP-15 Logs/reports/security | Supabase + GitHub | Security/static-analysis roles |
| WP-16 Full QA | Testifly + YepCode + QAMap role | Release Manager |
| WP-17 Release candidate | Release Manager | Owner |
| WP-18 Production | Vercel + Supabase + GitHub | Production smoke-test gate |

## Owner involvement

The business owner is not the routine QA worker. Owner input is required only for:

1. a business rule that cannot be inferred from approved requirements;
2. inaccessible credentials or third-party account authorization;
3. an irreversible/destructive production action;
4. final release-candidate approval.