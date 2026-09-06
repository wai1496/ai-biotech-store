-- WP-04 staging category/visual alignment
-- Staging only. Do not run against production without explicit release approval.
-- Align category colors with the locked storefront visual layer palette and
-- move L-GLUTATHIONE into Regeneration (green) per owner-confirmed category rules.

begin;

update public.categories set color='#FF4FA0', updated_at=now()
where slug='bonding' and color is distinct from '#FF4FA0';

update public.categories set color='#E0B300', updated_at=now()
where slug='hormone' and color is distinct from '#E0B300';

update public.categories set color='#D4AF37', updated_at=now()
where slug='longevity' and color is distinct from '#D4AF37';

update public.categories set color='#2563EB', updated_at=now()
where slug='solvent' and color is distinct from '#2563EB';

update public.categories set color='#38BDF8', updated_at=now()
where slug='special-blend' and color is distinct from '#38BDF8';

update public.products p
set category_id=c.id, updated_at=now()
from public.categories c
where p.id='glutathione'
  and c.slug='regeneration'
  and p.category_id is distinct from c.id;

commit;

-- Verification
select name,slug,color from public.categories order by name;
select p.id,p.name,c.name as category,c.color
from public.products p join public.categories c on c.id=p.category_id
where p.id='glutathione';
