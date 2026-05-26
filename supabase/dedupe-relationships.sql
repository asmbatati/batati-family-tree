-- =============================================================================
-- One-time cleanup: remove duplicate (type, from_id, to_id) triples in
-- public.relationships, then add a unique constraint so the bug can't recur.
-- =============================================================================
-- Run this in Supabase SQL Editor on an existing database where the focus
-- view shows the same child / spouse twice. New installs created from
-- supabase/schema.sql already have the constraint.
-- =============================================================================

begin;

-- Inspect first if you want:
-- select type, from_id, to_id, count(*)
-- from public.relationships
-- group by type, from_id, to_id
-- having count(*) > 1;

-- Delete the later-inserted copy of every duplicate row, keeping the earliest.
delete from public.relationships r1
using public.relationships r2
where r1.ctid > r2.ctid
  and r1.type    = r2.type
  and r1.from_id = r2.from_id
  and r1.to_id   = r2.to_id;

-- Enforce uniqueness going forward.
alter table public.relationships drop constraint if exists relationships_uniq;
alter table public.relationships add  constraint relationships_uniq unique (type, from_id, to_id);

commit;
