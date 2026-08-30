-- AI BioTech staging catalog integrity audit
-- READ ONLY. Run against authoritative staging project rpnwssqvurpdennpzplx.
-- This script must never be pointed at production by an automated job.

with active_products as (
  select p.*
  from public.products p
  where p.archived_at is null
),
active_variants as (
  select v.*,p.name as product_name
  from public.variants v
  join active_products p on p.id=v.product_id
  where v.active is true and v.archived_at is null
),
duplicate_skus as (
  select sku,count(*) as row_count,array_agg(id order by id) as variant_ids
  from active_variants
  where nullif(btrim(sku),'') is not null
  group by sku
  having count(*)>1
),
duplicate_keys as (
  select product_id,lower(btrim(strength_label)) as strength_key,lower(btrim(format)) as format_key,
         count(*) as row_count,array_agg(id order by id) as variant_ids
  from active_variants
  group by product_id,lower(btrim(strength_label)),lower(btrim(format))
  having count(*)>1
),
anomalies as (
  select 'MISSING_SKU'::text as issue,v.product_id,v.product_name,v.id as variant_id,
         v.strength_label,v.format,v.sku,v.price,v.stock_quantity,v.reserved_quantity,
         'Active variant has a null or blank SKU.'::text as detail
  from active_variants v where nullif(btrim(v.sku),'') is null

  union all
  select 'DUPLICATE_SKU',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'SKU is shared by more than one active variant.'
  from active_variants v join duplicate_skus d on d.sku=v.sku

  union all
  select 'DUPLICATE_VARIANT_KEY',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Duplicate active product + strength + format key.'
  from active_variants v
  join duplicate_keys d on d.product_id=v.product_id
   and d.strength_key=lower(btrim(v.strength_label))
   and d.format_key=lower(btrim(v.format))

  union all
  select 'NONPOSITIVE_PRICE',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Price is null, zero or negative.'
  from active_variants v where v.price is null or v.price<=0

  union all
  select 'NEGATIVE_STOCK',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Stock quantity is negative.'
  from active_variants v where v.stock_quantity<0

  union all
  select 'NEGATIVE_RESERVED',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Reserved quantity is negative.'
  from active_variants v where v.reserved_quantity<0

  union all
  select 'RESERVED_EXCEEDS_STOCK',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Reserved quantity exceeds physical stock.'
  from active_variants v where v.reserved_quantity>v.stock_quantity

  union all
  select 'UNSUPPORTED_FORMAT',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Format is outside Vial, Pen, Cartridge or Bottle.'
  from active_variants v where v.format not in ('Vial','Pen','Cartridge','Bottle')

  union all
  select 'UNSUPPORTED_UNIT',v.product_id,v.product_name,v.id,v.strength_label,v.format,v.sku,
         v.price,v.stock_quantity,v.reserved_quantity,
         'Strength unit is outside mg, mcg or mL.'
  from active_variants v where lower(v.strength_unit) not in ('mg','mcg','ml')
),
products_without_variants as (
  select p.id as product_id,p.name as product_name
  from active_products p
  where not exists(select 1 from active_variants v where v.product_id=p.id)
),
category_issues as (
  select p.id as product_id,p.name as product_name,
         case
           when p.category_id is null then 'Product has no category.'
           when c.id is null then 'Product references a missing category.'
           when nullif(btrim(c.color),'') is null then 'Category has no colour.'
         end as detail
  from active_products p
  left join public.categories c on c.id=p.category_id
  where p.category_id is null or c.id is null or nullif(btrim(c.color),'') is null
),
summary as (
  select jsonb_build_object(
    'products', (select count(*) from active_products),
    'active_variants', (select count(*) from active_variants),
    'anomalies', (select count(*) from anomalies),
    'products_without_active_variants', (select count(*) from products_without_variants),
    'category_issues', (select count(*) from category_issues),
    'formats', (select jsonb_object_agg(format,cnt order by format) from (select format,count(*) cnt from active_variants group by format) x),
    'units', (select jsonb_object_agg(strength_unit,cnt order by strength_unit) from (select strength_unit,count(*) cnt from active_variants group by strength_unit) x)
  ) as data
)
select jsonb_build_object(
  'summary',(select data from summary),
  'variant_anomalies',coalesce((select jsonb_agg(to_jsonb(a) order by issue,product_id,strength_label,format) from anomalies a),'[]'::jsonb),
  'products_without_active_variants',coalesce((select jsonb_agg(to_jsonb(p) order by product_name) from products_without_variants p),'[]'::jsonb),
  'category_issues',coalesce((select jsonb_agg(to_jsonb(c) order by product_name) from category_issues c),'[]'::jsonb)
) as catalog_integrity_audit;
