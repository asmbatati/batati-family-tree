-- =============================================================================
-- Al-Batati family tree — User claim + moderation queue
-- =============================================================================
-- Run AFTER supabase/schema.sql and supabase/auth.sql. Idempotent (uses
-- `create table if not exists` and `drop policy if exists`).
--
-- Adds three concepts:
--   1. `public.user_people`        — links an auth.users row to a people row
--                                    (so a logged-in user "claims" their place
--                                    in the tree).
--   2. `public.pending_edits`      — moderation queue. Authenticated non-editor
--                                    users insert proposed edits here; editors
--                                    approve/reject.
--   3. `public.events.status`      — extends the existing events table with a
--                                    pending/approved/rejected lifecycle.
-- =============================================================================

-- 1. user_people --------------------------------------------------------------

create table if not exists public.user_people (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  person_id  uuid references public.people(id) on delete set null,
  claimed_at timestamptz not null default now()
);
create index if not exists user_people_person_idx on public.user_people (person_id);

alter table public.user_people enable row level security;

-- Users can read and write their own claim row only.
drop policy if exists "user_people self" on public.user_people;
create policy "user_people self" on public.user_people
  for all to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Editors can read every claim (so the admin queue can show "who is this user?").
drop policy if exists "user_people editors read" on public.user_people;
create policy "user_people editors read" on public.user_people
  for select to authenticated
  using (auth.uid() in (select user_id from public.editors));

-- 2. pending_edits ------------------------------------------------------------

create table if not exists public.pending_edits (
  id              uuid primary key default gen_random_uuid(),
  submitted_by    uuid not null references auth.users(id) on delete cascade,
  -- Which table this edit targets.
  entity_type     text not null check (entity_type in ('person','relationship','event')),
  -- What kind of operation.
  operation       text not null check (operation in ('insert','update','delete')),
  -- For update/delete: the row id being modified. For insert: NULL until approved.
  target_id       uuid,
  -- Column-name → new value map (insert/update). NULL for delete.
  payload         jsonb,
  -- Snapshot of the original row (for update/delete). NULL for insert.
  original_payload jsonb,
  -- Free-text note from the submitter ("why I'm proposing this").
  note            text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  -- Editor's response.
  review_note     text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz not null default now()
);
create index if not exists pending_edits_status_idx       on public.pending_edits (status);
create index if not exists pending_edits_submitter_idx    on public.pending_edits (submitted_by);
create index if not exists pending_edits_entity_idx       on public.pending_edits (entity_type, target_id);

alter table public.pending_edits enable row level security;

-- Submitters can see + insert their own pending rows.
drop policy if exists "pending_edits own select" on public.pending_edits;
create policy "pending_edits own select" on public.pending_edits
  for select to authenticated using (submitted_by = auth.uid());

drop policy if exists "pending_edits own insert" on public.pending_edits;
create policy "pending_edits own insert" on public.pending_edits
  for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');

-- Editors can read everything and update status/review fields.
drop policy if exists "pending_edits editors all" on public.pending_edits;
create policy "pending_edits editors all" on public.pending_edits
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));

-- 3. Events: add moderation lifecycle ----------------------------------------

alter table public.events add column if not exists status        text default 'approved' check (status in ('pending','approved','rejected'));
alter table public.events add column if not exists submitted_by  uuid references auth.users(id);
alter table public.events add column if not exists reviewed_by   uuid references auth.users(id);
alter table public.events add column if not exists reviewed_at   timestamptz;

-- Public read: only approved events are visible to anonymous viewers. Editors
-- see all; submitters see their own pending entries.
drop policy if exists "public read events" on public.events;
drop policy if exists "public read approved events" on public.events;
create policy "public read approved events" on public.events
  for select using (
    status = 'approved'
    or auth.uid() in (select user_id from public.editors)
    or submitted_by = auth.uid()
  );

-- Authenticated non-editors can insert events with status='pending'.
drop policy if exists "auth insert events pending" on public.events;
create policy "auth insert events pending" on public.events
  for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

-- Editors retain full write access (from auth.sql).
-- (The existing "editors write events" policy stays as-is.)

-- =============================================================================
-- After running: notify pgrst to reload the schema cache.
-- =============================================================================
notify pgrst, 'reload schema';
