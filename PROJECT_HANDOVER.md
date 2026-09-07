# AI BioTech — Project Handover / Source of Truth

Last updated: 2026-09-07 (Malaysia, UTC+8)

## Purpose
This file is the durable project memory for AI BioTech. It exists so work can be recovered even if a ChatGPT conversation disappears. Do not store passwords, API secret values, service-role values, access tokens, or customer PII here.

## Canonical systems
- GitHub repository: `wai1496/ai-biotech-store`
- Vercel main project: `ai-biotech-store` (`prj_9I2xhrMBBbPL0qUwNdP4YUVC5SWI`)
- Supabase primary project: `Ai BioTech Project` (`yjauxyvtrmdriwtmckkl`)
- Supabase staging project exists separately: `AI BioTech Staging` (`rpnwssqvurpdennpzplx`)
- Separate legacy payment bridge: Vercel `aibiotech-toyyibpay-bridge`, GitHub `wai1496/aibiotech-toyyibpay-bridge`. Treat as reference/legacy integration, not as the main storefront.
- Intended customer domain after final production QA: `AiBioTech.vip` / `aibiotech.vip`.

## Branch / environment discipline
- `main` = stable/production source. Do not use a random preview branch as the permanent customer domain.
- Current storefront/payment QA branch: `feature/storefront-runtime-visuals`, PR #38.
- Admin MFA/2FA work is separate: `feature/admin-mfa-2fa`.
- Payment testing must remain ToyyibPay sandbox until end-to-end verification passes.
- Quick Order is a separate Cloudflare-hosted system and has its own ToyyibPay configuration. Do not copy or overwrite Quick Order credentials while working on the Vercel main store.

## Storefront product/image rules
- Product cards should support direct add-to-cart / quick selection, especially mobile, without forcing repeated product-page navigation.
- Product visual system uses reusable masters/layers for vial, pen, and cartridge. Preferred output: 1:1, transparent background, consistent geometry and label placement.
- Vial cap is white; do not add unnecessary colored inner rubber. Category color belongs to label/design system rather than arbitrary cap/rubber color.
- Long cartridge product names should use the approved standard label layout rather than forcing text to shrink/drop unpredictably.
- Category colors are established in project requirements and should remain consistent.
- AOD-9604 and bacteriostatic water are vial-only. Retatrutide range extends to 60 mg.
- Bacteriostatic Water: 3 mL RM5; 10 mL RM10.

## Checkout / member requirements
- Malaysia-only shipping address UX: Full name, mobile, address lines, postcode, city, state, country fixed to Malaysia.
- Saved addresses must persist and be selectable at checkout.
- Cart/add-to-cart should keep shopping flow convenient; adding an item should not force checkout immediately.
- Member area should expose relevant order history and account data.
- Orders currently start as `pending_payment` until payment verification succeeds.

## Shipping architecture
- Earlier temporary fallback discussed: West/Peninsular Malaysia RM7, Sabah/Sarawak RM15.
- Final intended architecture: EasyParcel provides actual shipping quotation/selection. Manual flat-rate logic is temporary fallback only and should be retired once EasyParcel is integrated and verified.
- Production target flow: address/postcode -> EasyParcel quote -> customer selects service -> shipping fee stored on order -> payment -> fulfillment/label workflow.

## ToyyibPay architecture
- Main Vercel storefront and Quick Order must remain separate configurations.
- Main storefront sandbox endpoint: `https://dev.toyyibpay.com`.
- Current main-store payment code supports sandbox-specific environment names and must fail closed rather than accidentally falling back to live money.
- Preferred Preview variable names:
  - `TOYYIBPAY_MODE=sandbox`
  - `TOYYIBPAY_SANDBOX_SECRET_KEY` = secret value stored only in Vercel
  - `TOYYIBPAY_SANDBOX_CATEGORY_CODE` = category created in the same ToyyibPay sandbox account
  - `SUPABASE_SERVICE_ROLE_KEY` = server-only value stored only in Vercel
- Never commit secret values to GitHub or paste them into project documentation.
- Desired payment flow: authenticated checkout -> create pending order -> create ToyyibPay sandbox BillCode -> redirect to ToyyibPay -> callback/return verification -> payment successful -> order paid -> cart cleared.
- Failure/cancel must not mark the order paid.

## Current ToyyibPay investigation status
- PR #38 contains the new main-store ToyyibPay sandbox integration.
- Checkout preflight can confirm sandbox configuration exists before order creation.
- Recent tests created pending orders but did not create payment records/BillCodes.
- Vercel runtime previously showed `POST /api/toyyibpay-create` returning ToyyibPay `Invalid API key`.
- The old `aibiotech-toyyibpay-bridge` was also tested and could not create a ToyyibPay category, so the issue is not solely storefront redirect code; sandbox credential/configuration must be verified.
- A temporary catalog product exists for QA: `TEST ORDER RM1`, SKU `TEST-RM1-SANDBOX`, RM1.00, stock 50. Disable/remove it after payment QA passes.
- Do not keep creating unnecessary pending orders while payment initialization is failing.

## Admin / security status
- Admin auth/MFA work is on separate branch `feature/admin-mfa-2fa`.
- Observed password recovery bug: Supabase recovery link briefly displays new-password UI, then an authenticated session can cause an automatic transition into admin before the user actually sets the new password.
- Observed admin authorization inconsistency: some sessions enter admin while other states show account not authorized.
- Actual MFA/2FA challenge/setup must be implemented/verified; do not weaken authorization or 2FA to work around the bug.
- Repair sequence: password recovery completion -> admin role/authorization mapping -> MFA enrollment/challenge -> admin access.

## Production release gate
Do not point the customer domain or enable live payment until all are true:
1. ToyyibPay sandbox completes end-to-end and order becomes Paid only after verified success.
2. Payment failure/cancel/retry behavior is safe.
3. Admin recovery, authorization and MFA/2FA are verified.
4. EasyParcel checkout/quote/fulfillment path is integrated or an explicitly approved temporary shipping fallback remains.
5. Mobile storefront/cart/member/address/product visual QA passes.
6. Approved feature branches are merged to `main` and a production smoke test passes.
7. Only then connect the permanent customer domain to the stable production deployment.

## Recovery procedure for a new ChatGPT conversation
Tell ChatGPT: `Open wai1496/ai-biotech-store and read PROJECT_HANDOVER.md and CURRENT_CHECKPOINT.md. Then inspect the actual GitHub PR/branch, Vercel deployment, and Supabase state before continuing. Do not infer secrets or reuse Quick Order credentials.`

The assistant should treat GitHub/Vercel/Supabase as the factual source of current technical state and this document as the decision/history map. If they disagree, inspect the live system and update these handover files.
