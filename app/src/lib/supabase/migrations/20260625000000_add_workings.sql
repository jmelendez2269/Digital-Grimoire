-- Phase 4: The Working — Workings as Experiments (persistence)
-- Creates the workings table (structured experiment record) and links
-- journal_pages to workings for longitudinal follow-up notes.

create table if not exists public.workings (
  id           uuid      primary key default gen_random_uuid(),
  user_id      uuid      not null references auth.users(id) on delete cascade,
  intent_text  text      not null,                      -- the hypothesis in the practitioner's own words
  palette      jsonb     not null default '{}',         -- assembled palette snapshot (graph-grounded)
  ritual       text      not null default '',           -- synthesized ritual text
  model_used   text      not null default '',           -- e.g. claude-haiku-4-5
  status       text      not null default 'draft'
                         check (status in ('draft', 'cast', 'shared')),
  cast_at      timestamptz,                             -- when the practitioner performed the rite
  conditions   jsonb,                                   -- auto-stamped at cast: moon_phase, day_ruler, season
  shared_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.workings                  is 'Practitioner experiments: intent → palette → ritual → cast (with auto-stamped conditions) → follow-up journal entries.';
comment on column public.workings.conditions       is 'Auto-stamped at cast time: {moon_phase, moon_phase_emoji, moon_illumination, day_ruler, day_ruler_planet, season, cast_date}';
comment on column public.workings.palette          is 'Snapshot of the assembled palette at generation time (AssembledPalette JSON).';

-- User working list (most recent first)
create index workings_user_id_created_at_idx
  on public.workings(user_id, created_at desc);

-- Future community feed (shared only)
create index workings_shared_at_idx
  on public.workings(shared_at desc)
  where shared_at is not null;

-- Auto-update updated_at on any row change
create or replace function public.set_workings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workings_set_updated_at
  before update on public.workings
  for each row execute function public.set_workings_updated_at();

-- RLS: owner-private by default; shared workings visible to all (Phase 6)
alter table public.workings enable row level security;

create policy "workings: owner select"
  on public.workings for select
  using (auth.uid() = user_id);

create policy "workings: owner insert"
  on public.workings for insert
  with check (auth.uid() = user_id);

create policy "workings: owner update"
  on public.workings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workings: owner delete"
  on public.workings for delete
  using (auth.uid() = user_id);

-- Link journal_pages → workings for follow-up notes (nullable; journal entry
-- can exist standalone or be associated with a specific working).
alter table public.journal_pages
  add column if not exists working_id uuid
  references public.workings(id) on delete set null;

comment on column public.journal_pages.working_id is 'Links this journal entry to a working as a follow-up observation.';

create index journal_pages_working_id_idx
  on public.journal_pages(working_id)
  where working_id is not null;
