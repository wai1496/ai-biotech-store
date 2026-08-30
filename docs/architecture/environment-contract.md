# AI BioTech Environment Contract

## Decision

The authoritative staging backend for the review branch is:

- Supabase project: `rpnwssqvurpdennpzplx`
- Project name: `AI BioTech Staging`
- Vercel branch: `review/master-build-20260829`
- Vercel alias: `ai-biotech-store-git-review-master-build-20260829-rk-cd1c.vercel.app`

The project `yjauxyvtrmdriwtmckkl` is classified as a protected legacy/operational source until a later production-classification exercise. It must not receive review-branch runtime writes.

## Why this decision

1. `rpnwssqvurpdennpzplx` is explicitly named `AI BioTech Staging`.
2. The active review storefront, member and checkout pages already consume `staging-config.js`, which points to this project.
3. The project contains staging-specific service-layer migrations for safe change batches, commerce, wallet, EasyParcel, roles, automation dry runs and recovery snapshots.
4. Its smaller customer/order fixture set is safer for development than the live-like history in `yjauxyvtrmdriwtmckkl`.
5. `yjauxyvtrmdriwtmckkl` contains multiple customer/order/invoice/protocol records, 152 inventory adjustments and 460 audit records and must therefore be treated conservatively.

## Runtime rule

Every active review-branch runtime must resolve Supabase through one contract:

```text
window.AIBT_CONFIG.supabaseUrl
window.AIBT_CONFIG.supabaseKey
STAGING_SUPABASE_URL
STAGING_SUPABASE_PUBLISHABLE_KEY
STAGING_SUPABASE_SERVICE_ROLE_KEY
```

For the review deployment, each value must refer to `rpnwssqvurpdennpzplx`.

No browser script may declare a second `SB_URL`, create a client using a different project or fetch masters from another project's database at runtime.

## Surface ownership

| Surface | Authoritative entry point | Backend contract |
|---|---|---|
| Storefront | `/index.html` | `staging-config.js` → `rpnw...` |
| Member Area | `/member.html` + `staging-member*.js` | `staging-config.js` → `rpnw...` |
| Checkout | `/checkout.html` + `staging-checkout*.js` | `staging-config.js` → `rpnw...` |
| Operations/Super Admin | `/ops.html` + `ops*.js` | `staging-config.js` → `rpnw...` |
| Legacy Admin | `/admin.html` | Must be retired, redirected or rewritten to use the same contract; it cannot remain a separate `yjaux...` admin |
| Staging APIs | `/api/staging-*` | Vercel `STAGING_SUPABASE_*` variables → `rpnw...` |
| Automated tests | repository test config | Assert the expected project ref and reject mixed refs |

## Data and storage migration rule

Runtime cross-project access is prohibited. Approved data/assets needed from `yjaux...` must be migrated explicitly:

1. Read-only export from the protected source.
2. Record source table/object, primary key/path, hash, dimensions/MIME and timestamp.
3. Import into `rpnw...` using new staging records/objects.
4. Verify counts, hashes and relationships.
5. Point staging records to staging-hosted objects.
6. Retain source records unchanged.
7. Record rollback and evidence in the related work-package issue.

The current cross-project `media_templates` URLs in `rpnw...` are temporary defects and must be replaced by assets hosted in the staging project or version-controlled safe assets.

## Browser credential rule

A Supabase publishable/anon key may be present in browser configuration because its privileges are constrained by RLS. Service-role, payment, shipping, email and other private credentials are server-only Vercel environment variables.

## Server/API protection

All `/api/staging-*` routes must:

- reject execution when `VERCEL_ENV=production` unless a separately approved production implementation exists;
- load only `STAGING_SUPABASE_*` variables;
- verify authenticated user/admin roles before privileged work;
- reject missing or mixed-project configuration;
- use ToyyibPay sandbox and EasyParcel demo/mock configuration during staging QA;
- log useful failures without exposing secret values.

## Legacy files

Files not referenced by the authoritative HTML entry points are legacy until proven otherwise. They may remain temporarily for rollback, but they must not:

- be loaded by active pages;
- be linked as the preferred user path;
- create clients to `yjaux...` from review pages;
- write to protected data;
- override the authoritative storefront/admin/member/checkout behavior.

Known legacy candidates include `admin.js`, `checkout.js`, `member.js`, `supabase-storefront.js` and temporary upload logic that directly references `yjaux...`.

## Acceptance tests

1. Repository scan finds no active runtime hard-coded `yjauxyvtrmdriwtmckkl` reference.
2. Browser pages expose `AIBT_CONFIG.environment === 'staging'` and expected project ref.
3. Storefront, Ops, Member and Checkout public requests target only `rpnw...`.
4. Staging server APIs reject production execution and use only `STAGING_SUPABASE_*`.
5. A deliberate bad/mixed config fixture fails closed with a clear diagnostic.
6. Data writes made by test fixtures appear only in `rpnw...` and are cleaned through documented test-fixture rollback.
7. No record in `yjaux...` changes during review-branch tests.

## Change gate

WP-02 cannot pass until the shared config module, route consolidation and tests enforce this contract. Until then, both Supabase projects remain protected and only read-only inspection or explicitly reviewed staging-safe changes are allowed.