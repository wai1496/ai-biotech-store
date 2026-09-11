# Preview database contract v1 — INSTALLED IN STAGING, NOT RUNTIME VERIFIED OR UNLOCKED

This is the versioned boundary for White Clean Core v1. The reviewed schema, RLS and function changes were installed only in the isolated `AI BioTech Staging` Supabase project (`rpnwssqvurpdennpzplx`) through `preview_database_contract_v1` and `preview_database_contract_v1_security_hardening`. No Production project was touched. `preview-database-evidence.json` remains **unverified**, no disposable transaction/concurrency fixture has been run, and all server provider calls and browser account/admin/checkout writes remain locked. Installation alone does not unlock this release. Changing the evidence file or browser lock requires separate review and explicit approval.

## Read-only evidence required before any unlock

- Confirm the project origin is exactly the approved isolated project, never Production. Do not copy or inspect credentials.
- With approved read-only access, export definitions of the functions below, their owners, `SECURITY DEFINER` flags, fixed `search_path`, grants, table columns/defaults/constraints, unique indexes, triggers, RLS policies and role memberships. Record an artifact digest, project identity, inspection time and reviewer in the evidence file.
- Review every invoked inventory, reservation, wallet, invoice, customer and audit transition. Preserve historical rows; prove no rollback or destructive reconciliation.
- In a separately authorized disposable database fixture, run owner/address/price/expiry/replay/concurrency/rollback/security cases below. Offline JavaScript reference models are specification tests, **not proof of PostgreSQL locking, RLS, grants, triggers or deployed schema**.
- Record verified return/callback Preview origin, provider demo/sandbox mode, isolated auth session flow, test results and explicit approval. No Production migration or activation is authorized by this document.

## Quotes and checkout

`shipping_quotes`: unique UUID `id`; authenticated `user_id`; numeric MYR `subtotal` and `shipping_amount` rounded to cents; normalized full destination/address binding; postcode/state; service/rate/courier fields; creation and explicit expiry timestamps (maximum ten minutes); consumed order ID and timestamp. Only service role may insert server-reverified quotes; authenticated users may read only their own. No anonymous grants, cross-owner reads or client update/delete/consume grants. The quote API presently supplies postcode/state/subtotal and explicit expiry; **full-address binding remains an unlock prerequisite**, not an inferred guarantee.

`create_order_with_shipping_quote(p_items,p_checkout_key,p_shipping_quote_id,p_voucher_code,p_wallet_amount,p_shipping_address,p_billing_address,p_notes)`:

1. Authenticate `auth.uid()`; unique `(user_id,checkout_key)` and persisted payload digest. Repeated keys return the same order before quote replay rejection; conflicting payloads for the same key reject. A lost response is retried with the exact saved payload and key.
2. Lock quote and affected inventory/wallet rows in stable order within one transaction. Require same owner, unexpired/unconsumed quote, exact normalized destination and service, current server-computed item subtotal, MYR currency and shipping amount. Browser subtotal/price/notes are not authority.
3. Recompute active/unarchived variants, usable stock, quantities, voucher eligibility and wallet use on the server. Reject insufficient stock or balance. Create exactly one order and its approved reservations/wallet/audit effects, consume quote exactly once, and commit together. Any exception rolls back the entire transaction.
4. Wrong owner/address/subtotal/service, expired/replayed quote and concurrent consumption must fail without any partial order, wallet debit or stock reservation. SECURITY DEFINER functions must fix `search_path`, validate ownership internally and have least-privilege EXECUTE grants.

## Exact payment reconciliation

`payments`: unique `(gateway,gateway_reference)` identifies one attempt, immutable order/amount/currency association, immutable successful transaction identity and event audit trail. Creating/retrying a bill also needs a durable serialized attempt intent; ambiguous bill creation must not silently create additional provider objects. That bill-creation durability is **not established by this wave**.

Server-only `reconcile_payment_attempt_v1(p_order_id,p_attempt_id,p_bill_code,p_status,p_transaction)` returns `{payment_status,order_status}` after commit:

- Lock exact attempt and order; require matching order, gateway bill, verified reference, expected amount and MYR currency. Never update other attempts by order ID alone.
- Successful attempt is terminal against delayed failed/pending events; failed must not regress to pending. Duplicate events have no repeated side effects. Failed may later become successful only from authoritative verified success; unknown/ambiguous provider references are rejected for manual review.
- Transition only `pending_payment -> paid`. Preserve `paid`, `ready_to_ship`, `shipped`, `delivered`, `completed`. For cancelled/refunded/other terminal orders, record the verified event and review/refund requirement without reviving the order or consuming inventory again.
- Payment, permitted lifecycle transition and approved inventory/wallet/invoice/audit effects are one transaction. Fault injection before commit leaves all unchanged. Return the actual stored order state, never a target inferred from the callback.
- Revoke EXECUTE from anon/authenticated; service-only access after API ownership/hash checks. No broad payment/order REST PATCH fallback exists in the adapter.

## Resumable shipping

Unique booking intent per order, durable provider order number, stage, lease token/expiry and audit history are required. `claim_shipping_booking_v1(p_order_id)` atomically claims the order and returns `{acquired,id,token,state}`. Competing callers receive `acquired:false`. Expired lease recovery must retain state; never reset submitting/paying to new.

`advance_shipping_booking_v1(p_intent_id,p_lease,p_patch)` validates lease and legal monotonic transitions, persists before returning, and returns the complete state. Stages: `new -> submitting -> submitted -> paying -> awaiting-awb -> ready`. `submitting` with no durable provider number is ambiguous and **must require manual reconciliation**, not resubmission. `paying` resumes status only, never blindly pays twice. Persist the provider order number before payment. Unknown statuses and failed payments remain blocked for reviewed recovery.

`complete_shipping_booking_v1(p_intent_id,p_lease,p_parcel)` must require a usable AWB, lock the exact shipment/order, atomically upsert that shipment and transition only eligible paid lifecycle state to ready-to-ship, preserving fulfilled/cancelled states. Return state and shipment data. `release_shipping_booking_v1` releases only the exact lease. All four functions are service/admin-only and enforce order state and lease ownership. RLS denies browser fulfillment writes.

Submission/payment timeouts, persistence failures, concurrency and missing-AWB behavior have offline adapter coverage. A failed provider-number save cannot be recovered automatically without authoritative provider lookup; the implementation stops for manual reconciliation rather than risking duplicate booking/charges. No claim of provider exactly-once guarantees is made.

## Remaining UI/content evidence

Member/admin/return currently use the same fail-closed runtime but intentionally cannot authenticate, reconcile or write. Published `pages` schema/content and full Cartridge guide are not evidenced; destinations show an explicit unavailable message instead of invented policy/handling content. Android screenshots at 360/390/620/720px, reference comparison, isolated member-to-return sessions and provider QA remain separate gates.
