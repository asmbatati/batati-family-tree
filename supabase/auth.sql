-- =============================================================================
-- Al-Batati family-tree — Auth & editor gating (PostgreSQL / Supabase)
-- =============================================================================
-- Run this AFTER supabase/schema.sql. It tightens write access so only users
-- listed in public.editors can mutate the tree. Public reads are unchanged.
-- =============================================================================

-- Editors table — gates write access to every other table.
create table if not exists public.editors (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

alter table public.editors enable row level security;

-- Each signed-in user can read their own editor row (only). This is what the
-- app's `isEditor()` helper uses to detect editorship after login. Reading
-- other editors' rows is not allowed by anyone.
--
-- NOTE: an earlier version of this policy used
--   using (auth.uid() in (select user_id from public.editors))
-- which is self-referential and effectively blocks all reads. Do not do that.
drop policy if exists "editors readable by editors" on public.editors;
drop policy if exists "editors read own row" on public.editors;
create policy "editors read own row" on public.editors
  for select to authenticated
  using (user_id = auth.uid());

-- Tighten write policies on every data table. Public read stays as-is.
-- The previous policies allowed any authenticated user to write — now you must
-- also be in public.editors.

drop policy if exists "auth write people" on public.people;
drop policy if exists "editors write people" on public.people;
create policy "editors write people" on public.people
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));

-- Public read on people is unconditional. Female-name redaction for
-- non-editors is done in the application layer (loadTree → maskFemaleAs)
-- so that the relationship graph stays intact for viewers — they see the
-- node, just not the name.
drop policy if exists "public read males, editors see all" on public.people;
drop policy if exists "public read people" on public.people;
create policy "public read people" on public.people
  for select using (true);

drop policy if exists "auth write relationships" on public.relationships;
drop policy if exists "editors write relationships" on public.relationships;
create policy "editors write relationships" on public.relationships
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));

drop policy if exists "auth write sources" on public.sources;
drop policy if exists "editors write sources" on public.sources;
create policy "editors write sources" on public.sources
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));

drop policy if exists "auth write events" on public.events;
drop policy if exists "editors write events" on public.events;
create policy "editors write events" on public.events
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));

-- person_sources had no policy at all before (RLS enabled but no policies =
-- locked down). Add one explicitly so editors can manage it.
drop policy if exists "editors write person_sources" on public.person_sources;
create policy "editors write person_sources" on public.person_sources
  for all to authenticated
  using      (auth.uid() in (select user_id from public.editors))
  with check (auth.uid() in (select user_id from public.editors));
drop policy if exists "public read person_sources" on public.person_sources;
create policy "public read person_sources" on public.person_sources
  for select using (true);

-- =============================================================================
-- BOOTSTRAP — make yourself the first editor.
-- =============================================================================
-- 1. Run the rest of this file once. RLS is now strict.
-- 2. Visit /<locale>/login in the app and sign in via magic link.
-- 3. Come back here, replace the email below, run this INSERT:
--
--    insert into public.editors (user_id, email)
--    select id, email from auth.users where email = 'YOUR_EMAIL_HERE';
--
-- After step 3, refresh the app — you should see editor controls.
-- To add more editors later: have them sign in once, then run the same INSERT
-- with their email.
