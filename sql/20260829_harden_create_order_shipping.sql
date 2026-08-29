create or replace function private.create_order(
  p_items jsonb,
  p_checkout_key text,
  p_voucher_code text default null,
  p_shipping_fee numeric default 0,
  p_wallet_amount numeric default 0,
  p_shipping_address jsonb default '{}'::jsonb,
  p_billing_address jsonb default '{}'::jsonb,
  p_notes text default ''
) returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare
  uid uuid := (select auth.uid());
  order_id uuid;
  order_no text;
  item jsonb;
  variant_row public.variants;
  product_row public.products;
  qty integer;
  subtotal_value numeric := 0;
  discount_value numeric := 0;
  configured_flat_shipping numeric := 0;
  configured_free_threshold numeric;
  shipping_value numeric := 0;
  amount_before_wallet numeric := 0;
  total_value numeric;
  voucher_row public.vouchers;
  wallet_before numeric;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_checkout_key is null or length(p_checkout_key) < 8 then raise exception 'Invalid checkout key'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  if p_wallet_amount < 0 then raise exception 'Invalid wallet amount'; end if;
  if coalesce(btrim(p_shipping_address->>'recipient_name'),'')='' or
     coalesce(btrim(p_shipping_address->>'phone'),'')='' or
     coalesce(btrim(p_shipping_address->>'line1'),'')='' or
     coalesce(btrim(p_shipping_address->>'city'),'')='' or
     coalesce(btrim(p_shipping_address->>'state'),'')='' or
     coalesce(btrim(p_shipping_address->>'postcode'),'')='' then
    raise exception 'Complete shipping address required';
  end if;
  select id into order_id from public.orders where checkout_key=p_checkout_key and user_id=uid;
  if order_id is not null then return order_id; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    begin qty := (item->>'quantity')::integer; exception when others then raise exception 'Invalid quantity'; end;
    if qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into variant_row from public.variants where id=item->>'variant_id' and active and archived_at is null for update;
    if not found then raise exception 'Variant unavailable'; end if;
    if variant_row.stock_quantity-variant_row.reserved_quantity < qty then raise exception 'Insufficient stock for %',variant_row.id; end if;
    subtotal_value := subtotal_value + variant_row.price*qty;
  end loop;
  if p_voucher_code is not null and btrim(p_voucher_code)<>'' then
    select * into voucher_row from public.vouchers where upper(code)=upper(btrim(p_voucher_code)) for update;
    if not found or not voucher_row.active then raise exception 'Voucher is invalid or disabled'; end if;
    if voucher_row.starts_at is not null and now()<voucher_row.starts_at then raise exception 'Voucher has not started'; end if;
    if voucher_row.expires_at is not null and now()>=voucher_row.expires_at then raise exception 'Voucher has expired'; end if;
    if subtotal_value<voucher_row.minimum_spend then raise exception 'Minimum spend not met'; end if;
    if voucher_row.usage_limit is not null and (select count(*) from public.voucher_redemptions where voucher_id=voucher_row.id)>=voucher_row.usage_limit then raise exception 'Voucher usage limit reached'; end if;
    if (select count(*) from public.voucher_redemptions where voucher_id=voucher_row.id and user_id=uid)>=voucher_row.usage_per_customer then raise exception 'Voucher customer limit reached'; end if;
    if voucher_row.new_customer_only and exists(select 1 from public.orders where user_id=uid and status<>'cancelled') then raise exception 'Voucher is for new customers only'; end if;
    discount_value := case when voucher_row.discount_type='fixed' then voucher_row.discount_value else subtotal_value*voucher_row.discount_value/100 end;
    if voucher_row.maximum_discount is not null then discount_value:=least(discount_value,voucher_row.maximum_discount); end if;
    discount_value:=least(discount_value,subtotal_value);
  end if;
  select coalesce(flat_shipping_fee,0),free_shipping_threshold into configured_flat_shipping,configured_free_threshold from public.stores where id='primary';
  shipping_value:=case when configured_free_threshold is not null and configured_free_threshold>0 and subtotal_value>=configured_free_threshold then 0 else coalesce(configured_flat_shipping,0) end;
  amount_before_wallet:=greatest(0,subtotal_value-discount_value+shipping_value);
  if p_wallet_amount>amount_before_wallet then raise exception 'Wallet amount cannot exceed order total'; end if;
  total_value:=amount_before_wallet-p_wallet_amount;
  if p_wallet_amount>0 then
    select balance into wallet_before from public.wallet_accounts where user_id=uid for update;
    if wallet_before is null or wallet_before<p_wallet_amount then raise exception 'Insufficient wallet balance'; end if;
  end if;
  order_no:='AIB-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.orders(order_number,user_id,status,subtotal,discount_total,shipping_fee,wallet_deduction,grand_total,voucher_id,shipping_address,billing_address,customer_email,customer_phone,notes,checkout_key)
  select order_no,uid,'pending_payment',subtotal_value,discount_value,shipping_value,p_wallet_amount,total_value,voucher_row.id,p_shipping_address,p_billing_address,c.email,c.phone,p_notes,p_checkout_key from public.customer_profiles c where c.user_id=uid returning id into order_id;
  if order_id is null then raise exception 'Customer profile missing'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    qty:=(item->>'quantity')::integer;
    select * into variant_row from public.variants where id=item->>'variant_id' for update;
    select * into product_row from public.products where id=variant_row.product_id;
    update public.variants set reserved_quantity=reserved_quantity+qty where id=variant_row.id;
    insert into public.order_items(order_id,variant_id,product_name,variant_label,sku,quantity,unit_price,line_total)
    values(order_id,variant_row.id,product_row.name,variant_row.strength_label||' / '||variant_row.format,variant_row.sku,qty,variant_row.price,variant_row.price*qty);
  end loop;
  if voucher_row.id is not null then insert into public.voucher_redemptions(voucher_id,user_id,order_id,amount) values(voucher_row.id,uid,order_id,discount_value); end if;
  if p_wallet_amount>0 then
    update public.wallet_accounts set balance=wallet_before-p_wallet_amount,updated_at=now() where user_id=uid;
    insert into public.wallet_transactions(user_id,transaction_type,amount,balance_before,balance_after,reason,order_id,idempotency_key,actor_user_id)
    values(uid,'debit',p_wallet_amount,wallet_before,wallet_before-p_wallet_amount,'Checkout wallet deduction',order_id,'checkout:'||p_checkout_key,uid);
  end if;
  insert into public.order_events(order_id,event,source,actor_user_id) values(order_id,'Order Created','customer',uid);
  return order_id;
end
$function$;
