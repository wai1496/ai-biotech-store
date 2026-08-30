-- WP-04 proposed catalog decisions
-- ENVIRONMENT: authoritative staging only (rpnwssqvurpdennpzplx)
-- DEFAULT BEHAVIOUR: NO-OP. Every decision flag is false.
-- Do not set a flag true until the corresponding GitHub decision is approved.
-- Never run this against production.

begin;

create temporary table wp04_before_state on commit drop as
select v.id,v.product_id,v.strength_label,v.format,v.sku,v.price,v.stock_quantity,
       v.reserved_quantity,v.active,v.archived_at
from public.variants v
where v.product_id in ('nad-plus','aod-9604','ara-290','bacteriostatic-water','retatrutide');

-- Explicit approval flags. Leave false until the source-decision issue is resolved.
with decisions as (
  select
    false::boolean as use_nad_vial_only_prices,
    false::boolean as archive_aod_cartridge,
    false::boolean as archive_aod_pen,
    false::boolean as archive_retatrutide_pen_above_30mg,
    false::boolean as archive_unsourced_retatrutide_strengths,
    false::boolean as archive_ara_290,
    false::boolean as archive_bac_water_10ml
),
nad_prices(strength_label,new_price) as (
  values ('100mg',70::numeric),('500mg',100::numeric),('1000mg',140::numeric)
),
update_nad as (
  update public.variants v
  set price=n.new_price,updated_at=now()
  from decisions d,nad_prices n
  where d.use_nad_vial_only_prices
    and v.product_id='nad-plus'
    and v.format='Vial'
    and v.strength_label=n.strength_label
    and v.active is true
    and v.archived_at is null
  returning v.id,'NAD_PRICE'::text as action
),
archive_candidates as (
  select v.id,
         case
           when d.archive_aod_cartridge and v.product_id='aod-9604' and v.format='Cartridge' then 'AOD_CARTRIDGE'
           when d.archive_aod_pen and v.product_id='aod-9604' and v.format='Pen' then 'AOD_PEN'
           when d.archive_retatrutide_pen_above_30mg and v.product_id='retatrutide' and v.format='Pen' and v.strength>30 then 'RETA_PEN_GT30'
           when d.archive_unsourced_retatrutide_strengths and v.product_id='retatrutide' and v.strength in (70,80,100) then 'RETA_UNSOURCED_STRENGTH'
           when d.archive_ara_290 and v.product_id='ara-290' then 'ARA_290'
           when d.archive_bac_water_10ml and v.product_id='bacteriostatic-water' and lower(v.strength_label)='10ml' then 'BAC_10ML'
         end as action
  from public.variants v cross join decisions d
  where v.active is true and v.archived_at is null
),
archive_rows as (
  update public.variants v
  set active=false,archived_at=now(),updated_at=now()
  from archive_candidates c
  where c.id=v.id and c.action is not null
  returning v.id,c.action
),
actions as (
  select * from update_nad
  union all
  select * from archive_rows
)
select coalesce(jsonb_agg(to_jsonb(actions) order by action,id),'[]'::jsonb) as proposed_actions_applied
from actions;

-- Mandatory post-change validation. This returns before and after values in one result.
select jsonb_build_object(
  'before',coalesce((select jsonb_agg(to_jsonb(b) order by product_id,strength_label,format) from wp04_before_state b),'[]'::jsonb),
  'after',coalesce((select jsonb_agg(to_jsonb(v) order by product_id,strength_label,format)
                    from public.variants v
                    where v.product_id in ('nad-plus','aod-9604','ara-290','bacteriostatic-water','retatrutide')),'[]'::jsonb)
) as wp04_validation;

-- SAFETY DEFAULT: this template always rolls back.
-- For an approved staging change, replace ROLLBACK with COMMIT only in a reviewed copy,
-- attach before/after evidence, and keep the generated rollback SQL below.
rollback;

-- Rollback pattern for an approved execution copy:
-- update public.variants v
-- set price=b.price,
--     stock_quantity=b.stock_quantity,
--     reserved_quantity=b.reserved_quantity,
--     active=b.active,
--     archived_at=b.archived_at,
--     updated_at=now()
-- from <persisted_before_state> b
-- where b.id=v.id;
