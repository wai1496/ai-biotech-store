# Preview database read-only inspection — 2026-09-09

Scope: isolated Supabase project `rpnwssqvurpdennpzplx` only. Read-only inspection. No migration, DDL, RLS, provider-mode, environment, credential, data mutation, or Production change was performed.

## Gate result: BLOCKED (protected database contract change required)

The isolated Preview database exists and is clearly separate from Production, but its currently installed schema does **not** match the approved `preview-database-v1` contract required by the White Clean integration branch. The release locks must remain closed.

## Read-only evidence gathered

### Project/data identity

- Isolated project origin expected by runtime code: `https://rpnwssqvurpdennpzplx.supabase.co`.
- Public schema is populated with the catalog and staging operational tables.
- RLS is enabled on the inspected commerce/account tables.
- Current catalog snapshot observed by metadata: 39 products, 224 variants, 9 categories.

### Installed commerce schema differs from the required contract

1. The contract requires a `shipping_quotes` table with owner, normalized full-address binding, subtotal/shipping amount, explicit short expiry, consumed order/timestamp and server-only mutation semantics.
   - Installed database exposes `shipping_rate_quotes` instead.
   - Its observed columns include `id`, `order_id`, `user_id`, provider/service/courier/rate/currency/payload, `expires_at`, `created_at`.
   - Required destination binding / consumed-order semantics are not evidenced by the installed columns.

2. The contract/code path for ToyyibPay expects an exact payment-attempt model suitable for `(gateway, gateway_reference)` / MYR reconciliation.
   - Installed `payments` table instead exposes `provider`, `provider_reference`, `status`, `amount`, `metadata` and timestamps.
   - No observed unique provider-reference index exists; only the primary key and an order-created index were observed.

3. The White Clean current adapter expects lifecycle state `ready_to_ship` in several shipping flows.
   - Installed `orders.status` check currently allows `pending_payment`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `refunded`.
   - `ready_to_ship` is not in the observed installed status constraint.

4. The contract requires server-only transactional functions including:
   - `create_order_with_shipping_quote`
   - `reconcile_payment_attempt_v1`
   - `claim_shipping_booking_v1`
   - `advance_shipping_booking_v1`
   - `complete_shipping_booking_v1`
   - `release_shipping_booking_v1`

   Read-only `pg_proc` inspection found none of those required functions. Of the specifically inspected account/protocol functions, only `get_my_protocol_guides()` was present.

### RLS evidence

Read-only `pg_policies` inspection showed authenticated SELECT/owner/admin policies on `addresses`, `customer_profiles`, `order_items`, `orders`, `payments`, `shipments`, `shipping_rate_quotes`, `wallet_accounts`, and `wallet_transactions`.

This is encouraging for the read boundary, but it does not prove the required transactional write path, function grants, exact locking/idempotency, full quote binding, payment reconciliation, or resumable shipping contract.

### Index evidence

Observed relevant indexes include:
- unique `(user_id, checkout_key)` on `orders`;
- unique `order_number` on `orders`;
- unique `order_id` on `shipments`;
- indexes on `shipping_rate_quotes` by user/time and order/expiry;
- no observed unique provider/payment reference index matching the required exact-attempt contract.

## Safety conclusion

Keep these locks in place:

- `preview-database-evidence.json` remains `status: unverified`.
- Browser Member/Checkout write paths remain locked.
- ToyyibPay/DuitNow provider calls remain locked by Preview safety.
- EasyParcel provider calls remain locked by Preview safety.
- No Production merge or activation.

## Exact protected change required before this gate can pass

Owner approval is required before changing the **isolated staging Supabase database schema/RLS/functions** to implement the reviewed `preview-database-v1` contract (or before approving a revised contract that deliberately adapts the code to the existing isolated schema). Any such implementation must remain isolated from Production and must be followed by read-only verification plus disposable-fixture concurrency/replay/rollback/security testing before the evidence status can be changed from `unverified`.
