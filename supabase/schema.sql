-- =============================================================================
-- Al-Batati family-tree — Supabase schema (PostgreSQL)
-- =============================================================================
-- Run this in the Supabase SQL editor after creating a fresh project.
-- شجرة عائلة البطاطي — مخطط قاعدة البيانات.
-- =============================================================================

-- People
create table if not exists public.people (
  id            uuid primary key default gen_random_uuid(),
  name_ar       text not null,
  name_en       text,
  title_ar      text,
  title_en      text,
  gender        text not null check (gender in ('male','female')),
  birth_year    int,
  death_year    int,
  status        text not null default 'unknown' check (status in ('living','deceased','unknown')),
  location      text,
  occupation_ar text,
  occupation_en text,
  bio_ar        text,
  bio_en        text,
  photo_url     text,
  family_ar     text default 'البطاطي',
  family_en     text default 'Al-Batati',
  generation    int,
  external_family_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists people_generation_idx on public.people (generation);
create index if not exists people_family_idx     on public.people (family_en);

-- Relationships
create table if not exists public.relationships (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in (
                'parent_of','spouse_of','sibling_of','milk_sibling_of',
                'uncle_paternal_of','uncle_maternal_of',
                'aunt_paternal_of','aunt_maternal_of',
                'cousin_of','guardian_of','other'
              )),
  from_id     uuid not null references public.people(id) on delete cascade,
  to_id       uuid not null references public.people(id) on delete cascade,
  start_year  int,
  end_year    int,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists relationships_from_idx on public.relationships (from_id);
create index if not exists relationships_to_idx   on public.relationships (to_id);
create index if not exists relationships_type_idx on public.relationships (type);

-- Sources
create table if not exists public.sources (
  id        uuid primary key default gen_random_uuid(),
  title_ar  text not null,
  title_en  text,
  author    text,
  year      int,
  type      text not null default 'other' check (type in ('book','document','oral','online','other')),
  url       text,
  notes     text,
  created_at timestamptz not null default now()
);

-- Join table: person ↔ source
create table if not exists public.person_sources (
  person_id uuid references public.people(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  primary key (person_id, source_id)
);

-- Events / announcements
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('wedding','birth','death','gathering','other')),
  title_ar     text not null,
  title_en     text,
  date         date not null,
  location     text,
  description_ar text,
  description_en text,
  person_ids   uuid[] default '{}',
  created_at   timestamptz not null default now()
);

-- Row-Level Security (RLS): publicly readable, only authenticated users can write.
alter table public.people        enable row level security;
alter table public.relationships enable row level security;
alter table public.sources       enable row level security;
alter table public.person_sources enable row level security;
alter table public.events        enable row level security;

drop policy if exists "public read people" on public.people;
create policy "public read people" on public.people for select using (true);
drop policy if exists "auth write people" on public.people;
create policy "auth write people" on public.people for all to authenticated using (true) with check (true);

drop policy if exists "public read relationships" on public.relationships;
create policy "public read relationships" on public.relationships for select using (true);
drop policy if exists "auth write relationships" on public.relationships;
create policy "auth write relationships" on public.relationships for all to authenticated using (true) with check (true);

drop policy if exists "public read sources" on public.sources;
create policy "public read sources" on public.sources for select using (true);
drop policy if exists "auth write sources" on public.sources;
create policy "auth write sources" on public.sources for all to authenticated using (true) with check (true);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (true);
drop policy if exists "auth write events" on public.events;
create policy "auth write events" on public.events for all to authenticated using (true) with check (true);
