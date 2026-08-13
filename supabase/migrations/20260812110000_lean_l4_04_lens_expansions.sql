-- LEAN-L4-04: durable child results for one-credit Seven Lenses expansions.

create table if not exists public.convergence_lens_expansions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_response_id uuid not null references public.convergence_responses(id) on delete cascade,
  lens_id text not null check (
    lens_id in (
      'scientific',
      'psychological',
      'philosophical',
      'religious_spiritual',
      'historical_anthropological',
      'symbolic_occult',
      'mathematical'
    )
  ),
  response_text text not null check (length(btrim(response_text)) > 0),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists convergence_lens_expansions_parent_idx
  on public.convergence_lens_expansions (user_id, parent_response_id, lens_id, created_at desc);

alter table public.convergence_lens_expansions enable row level security;
alter table public.convergence_lens_expansions force row level security;

revoke all on table public.convergence_lens_expansions from anon;
revoke all on table public.convergence_lens_expansions from authenticated;
grant select on table public.convergence_lens_expansions to authenticated;

create policy convergence_lens_expansions_select_own
  on public.convergence_lens_expansions
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.convergence_lens_expansions is
  'User-owned durable child results for metered single-lens expansions. Writes are service-only; authenticated users may read only their own rows.';
