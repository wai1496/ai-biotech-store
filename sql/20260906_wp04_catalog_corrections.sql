-- WP-04 staging catalog reconciliation
-- Source: AI_BioTech_Master_Price_List (2).pdf plus owner exceptions:
--   * AOD-9604 is Vial only
--   * Bacteriostatic Water is Vial only
--   * Bacteriostatic Water 3mL = RM5, 10mL = RM10
--   * stock_quantity baseline = 50
-- Staging only. Do not run against production without explicit release approval.

begin;

-- Owner exception: AOD-9604 is Vial only.
update public.variants
set active = false, updated_at = now()
where product_id = 'aod'
  and format <> 'Vial'
  and active is distinct from false;

-- Owner exception: Bacteriostatic Water is Vial only.
update public.variants
set active = false, updated_at = now()
where product_id = 'bacwater'
  and format <> 'Vial'
  and active is distinct from false;

-- Owner-confirmed BAC Water prices.
update public.variants
set price = 5, updated_at = now()
where product_id = 'bacwater'
  and format = 'Vial'
  and strength_label = '3mL';

update public.variants
set price = 10, updated_at = now()
where product_id = 'bacwater'
  and format = 'Vial'
  and strength_label = '10mL';

-- Owner requested stock quantity = 50 for all catalog variants.
update public.variants
set stock_quantity = 50, updated_at = now()
where stock_quantity is distinct from 50;

commit;

-- Verification query: should return zero rows.
select id, product_id, strength_label, format, price, stock_quantity, active
from public.variants
where (product_id = 'aod' and format <> 'Vial' and active = true)
   or (product_id = 'bacwater' and format <> 'Vial' and active = true)
   or (product_id = 'bacwater' and format = 'Vial' and strength_label = '3mL' and price <> 5)
   or (product_id = 'bacwater' and format = 'Vial' and strength_label = '10mL' and price <> 10)
   or stock_quantity <> 50;
