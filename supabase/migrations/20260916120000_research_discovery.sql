-- Private, addressable research runs. Generated findings never publish themselves.
create table public.research_discoveries (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.research_discoveries(id),
  root_id uuid not null,
  question text not null check (length(question) between 2 and 2000),
  status text not null default 'running' check (status in ('running','complete','failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index research_discoveries_owner_created on public.research_discoveries(owner_id, created_at desc);
alter table public.research_discoveries enable row level security;
revoke all on public.research_discoveries from anon, authenticated;
grant all on public.research_discoveries to service_role;

alter table public.research_inquiries add column discovery_root_id uuid unique references public.research_discoveries(id);
alter table public.research_findings add column discovery_id uuid references public.research_discoveries(id);
alter table public.research_findings add column discovery_index integer;
alter table public.research_findings add constraint research_findings_discovery_unique unique(discovery_id, discovery_index);
