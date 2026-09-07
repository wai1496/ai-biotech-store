# AI BioTech — Current Checkpoint

Updated: 2026-09-07 (Malaysia, UTC+8)

## Active priority
Finish main-store ToyyibPay sandbox payment QA before EasyParcel, admin MFA repair, final QA, or domain cutover.

## Correct work target
- Repo: `wai1496/ai-biotech-store`
- Main Vercel project: `ai-biotech-store`
- Payment/storefront branch: `feature/storefront-runtime-visuals`
- PR: #38
- Do NOT test payment from a `main` production redeploy; it may not contain the PR #38 payment code.

## Exact next action
In Vercel project `ai-biotech-store`, confirm the **Preview** environment has:
- `TOYYIBPAY_MODE=sandbox`
- `TOYYIBPAY_SANDBOX_SECRET_KEY` populated from the `dev.toyyibpay.com` sandbox account
- `TOYYIBPAY_SANDBOX_CATEGORY_CODE` populated with the main-store category from that same sandbox account
- `SUPABASE_SERVICE_ROLE_KEY` populated server-side

Do not expose the values in chat/screenshots.

After confirming variables:
1. Redeploy `feature/storefront-runtime-visuals` / PR #38 as Preview.
2. Verify deployment is READY and actually references the feature branch.
3. Use only `TEST ORDER RM1` for the next checkout test.
4. Expected: create pending order -> create BillCode -> redirect to `dev.toyyibpay.com`.
5. Complete sandbox bank simulator payment.
6. Verify return/callback and server-side transaction verification.
7. Confirm `payments.status=successful`, `orders.status=paid`, and cart clears only after verified success.

## Known evidence
- Earlier attempts produced pending orders without payment records/BillCodes.
- Main-store runtime previously returned ToyyibPay `Invalid API key` during `POST /api/toyyibpay-create`.
- Legacy `aibiotech-toyyibpay-bridge` also failed to create a sandbox category during direct testing, so sandbox credential/config must be verified rather than assuming storefront redirect is the root cause.
- Temporary RM1 QA product exists. Remove/disable after payment QA.

## Later queue
1. EasyParcel live shipping quotes; retire temporary West RM7 / East RM15 fallback when verified.
2. Repair `feature/admin-mfa-2fa`: password recovery redirect/session behavior, admin authorization mapping, real MFA enrollment/challenge.
3. Full mobile/storefront/member/address/cart/product visual QA.
4. Merge approved work to `main`.
5. Production smoke test.
6. Connect `AiBioTech.vip` only after release gates pass.

## Safety
- Quick Order is separate on Cloudflare with separate ToyyibPay configuration. Do not modify it while fixing main Vercel store payments.
- Never commit or document secret values.
