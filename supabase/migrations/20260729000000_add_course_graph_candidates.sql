-- Lossless, review-first storage for course-derived graph candidates.
--
-- This plane is intentionally separate from legacy convergence concepts and
-- correspondences. Candidate imports do not publish or promote canonical graph
-- data; they preserve typed nodes, directed multi-predicate edges, evidence,
-- draft syntheses, connection summaries, and review state for human curation.

create extension if not exists pgcrypto;

create table if not exists public.course_graph_imports (
  id uuid primary key default gen_random_uuid(),
  bundle_slug text not null unique,
  version integer not null,
  course_stable_id text not null,
  course_slug text not null,
  course_id_tag text not null,
  canonical_course_id uuid,
  vocabulary_version text not null,
  source_path text not null,
  source_sha256 text not null,
  package_sha256 text not null,
  source_status text not null,
  run_mode text not null,
  prepared_on date not null,
  review_state text not null default 'candidate',
  manifest jsonb not null,
  manifest_sha256 text not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint course_graph_imports_version_check check (version > 0),
  constraint course_graph_imports_source_hash_check check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint course_graph_imports_package_hash_check check (package_sha256 ~ '^[0-9a-f]{64}$'),
  constraint course_graph_imports_manifest_hash_check check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  constraint course_graph_imports_review_state_check
    check (review_state in ('candidate', 'in_review', 'approved', 'rejected', 'archived'))
);

create table if not exists public.course_graph_evidence (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.course_graph_imports(id) on delete cascade,
  evidence_key text not null,
  evidence_class text not null,
  heading_path text not null,
  locator text not null,
  excerpt text not null,
  source_path text not null,
  source_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_graph_evidence_source_hash_check check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint course_graph_evidence_import_key_unique unique (import_id, evidence_key)
);

create table if not exists public.course_graph_entities (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.course_graph_imports(id) on delete cascade,
  stable_id text not null,
  entity_kind text not null,
  slug text not null,
  display_name text not null,
  aliases text[] not null default '{}',
  synthesis_draft text not null,
  synthesis_live text,
  course_role text,
  identity_state text not null,
  review_state text not null default 'candidate',
  candidate_class text not null,
  evidence_keys text[] not null default '{}',
  canonical_refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint course_graph_entities_kind_check check (
    entity_kind in (
      'course', 'lesson', 'work', 'edition', 'passage', 'person',
      'tradition', 'concept', 'institution', 'artifact'
    )
  ),
  constraint course_graph_entities_identity_state_check
    check (identity_state in ('existing', 'merge_candidate', 'new', 'unresolved')),
  constraint course_graph_entities_review_state_check
    check (review_state in ('candidate', 'in_review', 'approved', 'rejected', 'deferred')),
  constraint course_graph_entities_candidate_class_check check (
    candidate_class in (
      'CANDIDATE_SOURCE_EXPLICIT',
      'CANDIDATE_IDENTITY_REVIEW',
      'CANDIDATE_CONCEPTUAL_REVIEW',
      'CANDIDATE_EDITORIAL_ONLY'
    )
  ),
  constraint course_graph_entities_import_stable_unique unique (import_id, stable_id)
);

create table if not exists public.course_graph_edges (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.course_graph_imports(id) on delete cascade,
  stable_id text not null,
  source_entity_id uuid not null references public.course_graph_entities(id) on delete cascade,
  target_entity_id uuid not null references public.course_graph_entities(id) on delete cascade,
  predicate text not null,
  edge_class text not null,
  epistemic_kind text not null,
  scope text,
  confidence text not null,
  weight numeric,
  connection_summary_draft text not null,
  connection_summary_live text,
  review_state text not null default 'candidate',
  candidate_class text not null,
  evidence_keys text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint course_graph_edges_no_self_edge check (source_entity_id <> target_entity_id),
  constraint course_graph_edges_class_check check (edge_class in ('structural', 'interpretive')),
  constraint course_graph_edges_epistemic_kind_check check (
    epistemic_kind in (
      'artifact_documented', 'documented_historical', 'conceptual',
      'editorial', 'tradition'
    )
  ),
  constraint course_graph_edges_confidence_check
    check (confidence in ('established', 'interpretive', 'speculative', 'tradition')),
  constraint course_graph_edges_weight_check
    check (weight is null or (weight >= 0 and weight <= 1)),
  constraint course_graph_edges_review_state_check
    check (review_state in ('candidate', 'in_review', 'approved', 'rejected', 'deferred')),
  constraint course_graph_edges_candidate_class_check check (
    candidate_class in (
      'CANDIDATE_SOURCE_EXPLICIT',
      'CANDIDATE_IDENTITY_REVIEW',
      'CANDIDATE_CONCEPTUAL_REVIEW',
      'CANDIDATE_EDITORIAL_ONLY'
    )
  ),
  constraint course_graph_edges_import_stable_unique unique (import_id, stable_id),
  constraint course_graph_edges_import_natural_unique
    unique (import_id, source_entity_id, target_entity_id, predicate)
);

create table if not exists public.course_graph_blocked_inferences (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.course_graph_imports(id) on delete cascade,
  proposal text not null,
  reason text not null,
  evidence_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_graph_blocked_import_proposal_unique unique (import_id, proposal)
);

create index if not exists course_graph_imports_course_slug_idx
  on public.course_graph_imports(course_slug);
create index if not exists course_graph_imports_review_state_idx
  on public.course_graph_imports(review_state);
create index if not exists course_graph_evidence_import_idx
  on public.course_graph_evidence(import_id);
create index if not exists course_graph_entities_import_kind_idx
  on public.course_graph_entities(import_id, entity_kind);
create index if not exists course_graph_entities_display_name_idx
  on public.course_graph_entities(display_name);
create index if not exists course_graph_entities_evidence_gin_idx
  on public.course_graph_entities using gin(evidence_keys);
create index if not exists course_graph_edges_import_predicate_idx
  on public.course_graph_edges(import_id, predicate);
create index if not exists course_graph_edges_source_idx
  on public.course_graph_edges(source_entity_id);
create index if not exists course_graph_edges_target_idx
  on public.course_graph_edges(target_entity_id);
create index if not exists course_graph_edges_evidence_gin_idx
  on public.course_graph_edges using gin(evidence_keys);

create or replace function public.course_graph_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists course_graph_imports_touch_updated_at on public.course_graph_imports;
create trigger course_graph_imports_touch_updated_at
  before update on public.course_graph_imports
  for each row execute function public.course_graph_touch_updated_at();

drop trigger if exists course_graph_evidence_touch_updated_at on public.course_graph_evidence;
create trigger course_graph_evidence_touch_updated_at
  before update on public.course_graph_evidence
  for each row execute function public.course_graph_touch_updated_at();

drop trigger if exists course_graph_entities_touch_updated_at on public.course_graph_entities;
create trigger course_graph_entities_touch_updated_at
  before update on public.course_graph_entities
  for each row execute function public.course_graph_touch_updated_at();

drop trigger if exists course_graph_edges_touch_updated_at on public.course_graph_edges;
create trigger course_graph_edges_touch_updated_at
  before update on public.course_graph_edges
  for each row execute function public.course_graph_touch_updated_at();

drop trigger if exists course_graph_blocked_touch_updated_at on public.course_graph_blocked_inferences;
create trigger course_graph_blocked_touch_updated_at
  before update on public.course_graph_blocked_inferences
  for each row execute function public.course_graph_touch_updated_at();

-- One RPC call performs the full exact-sync import in a single PostgreSQL
-- transaction. Any validation or constraint failure rolls the entire import back.
create or replace function public.import_course_graph_candidate(p_bundle jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_import_id uuid;
  v_entity_count integer;
  v_edge_count integer;
  v_evidence_count integer;
  v_blocked_count integer;
  v_upserted_count integer;
begin
  if coalesce(p_bundle->>'bundle_kind', '') <> 'course_graph_candidate' then
    raise exception 'Unsupported bundle kind: %', p_bundle->>'bundle_kind';
  end if;

  if coalesce((p_bundle->>'version')::integer, 0) <> 1 then
    raise exception 'Unsupported course graph candidate version: %', p_bundle->>'version';
  end if;

  v_entity_count := jsonb_array_length(coalesce(p_bundle->'entities', '[]'::jsonb));
  v_edge_count := jsonb_array_length(coalesce(p_bundle->'edges', '[]'::jsonb));
  v_evidence_count := jsonb_array_length(coalesce(p_bundle->'evidence', '[]'::jsonb));
  v_blocked_count := jsonb_array_length(coalesce(p_bundle->'blocked_inferences', '[]'::jsonb));

  if v_entity_count = 0 then
    raise exception 'Candidate bundle has no entities';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bundle->'entities') entity
    group by entity->>'stable_id'
    having count(*) > 1
  ) then
    raise exception 'Candidate bundle contains duplicate entity stable IDs';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bundle->'edges') edge
    group by edge->>'stable_id'
    having count(*) > 1
  ) then
    raise exception 'Candidate bundle contains duplicate edge stable IDs';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bundle->'edges') edge
    where not exists (
      select 1
      from jsonb_array_elements(p_bundle->'entities') entity
      where entity->>'stable_id' = edge->>'source_stable_id'
    )
    or not exists (
      select 1
      from jsonb_array_elements(p_bundle->'entities') entity
      where entity->>'stable_id' = edge->>'target_stable_id'
    )
  ) then
    raise exception 'Candidate bundle contains an edge with a missing endpoint';
  end if;

  insert into public.course_graph_imports (
    bundle_slug,
    version,
    course_stable_id,
    course_slug,
    course_id_tag,
    canonical_course_id,
    vocabulary_version,
    source_path,
    source_sha256,
    package_sha256,
    source_status,
    run_mode,
    prepared_on,
    review_state,
    manifest,
    manifest_sha256,
    imported_at
  )
  values (
    p_bundle->>'bundle_slug',
    (p_bundle->>'version')::integer,
    p_bundle#>>'{course,stable_id}',
    p_bundle#>>'{course,slug}',
    p_bundle#>>'{course,course_id_tag}',
    nullif(p_bundle#>>'{course,canonical_course_id}', '')::uuid,
    p_bundle#>>'{package,vocabulary_version}',
    p_bundle#>>'{package,source_path}',
    p_bundle#>>'{package,source_sha256}',
    p_bundle#>>'{package,package_sha256}',
    p_bundle#>>'{package,source_status}',
    p_bundle#>>'{package,run_mode}',
    (p_bundle->>'prepared_on')::date,
    'candidate',
    p_bundle,
    encode(digest(convert_to(p_bundle::text, 'UTF8'), 'sha256'), 'hex'),
    now()
  )
  on conflict (bundle_slug) do update set
    version = excluded.version,
    course_stable_id = excluded.course_stable_id,
    course_slug = excluded.course_slug,
    course_id_tag = excluded.course_id_tag,
    canonical_course_id = excluded.canonical_course_id,
    vocabulary_version = excluded.vocabulary_version,
    source_path = excluded.source_path,
    source_sha256 = excluded.source_sha256,
    package_sha256 = excluded.package_sha256,
    source_status = excluded.source_status,
    run_mode = excluded.run_mode,
    prepared_on = excluded.prepared_on,
    review_state = 'candidate',
    manifest = excluded.manifest,
    manifest_sha256 = excluded.manifest_sha256,
    imported_at = now()
  returning id into v_import_id;

  insert into public.course_graph_evidence (
    import_id,
    evidence_key,
    evidence_class,
    heading_path,
    locator,
    excerpt,
    source_path,
    source_sha256
  )
  select
    v_import_id,
    item->>'evidence_key',
    item->>'evidence_class',
    item->>'heading_path',
    item->>'locator',
    item->>'excerpt',
    p_bundle#>>'{package,source_path}',
    p_bundle#>>'{package,source_sha256}'
  from jsonb_array_elements(coalesce(p_bundle->'evidence', '[]'::jsonb)) item
  on conflict (import_id, evidence_key) do update set
    evidence_class = excluded.evidence_class,
    heading_path = excluded.heading_path,
    locator = excluded.locator,
    excerpt = excluded.excerpt,
    source_path = excluded.source_path,
    source_sha256 = excluded.source_sha256;

  get diagnostics v_upserted_count = row_count;
  if v_upserted_count <> v_evidence_count then
    raise exception 'Evidence upsert count mismatch: expected %, received %',
      v_evidence_count, v_upserted_count;
  end if;

  insert into public.course_graph_entities (
    import_id,
    stable_id,
    entity_kind,
    slug,
    display_name,
    aliases,
    synthesis_draft,
    course_role,
    identity_state,
    review_state,
    candidate_class,
    evidence_keys,
    metadata
  )
  select
    v_import_id,
    item->>'stable_id',
    item->>'entity_kind',
    item->>'slug',
    item->>'display_name',
    coalesce(
      array(select jsonb_array_elements_text(coalesce(item->'aliases', '[]'::jsonb))),
      '{}'::text[]
    ),
    item->>'synthesis',
    nullif(item->>'course_role', ''),
    item->>'identity_state',
    item->>'review_state',
    item->>'candidate_class',
    coalesce(
      array(select jsonb_array_elements_text(coalesce(item->'evidence_keys', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(item->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_bundle->'entities') item
  on conflict (import_id, stable_id) do update set
    entity_kind = excluded.entity_kind,
    slug = excluded.slug,
    display_name = excluded.display_name,
    aliases = excluded.aliases,
    synthesis_draft = excluded.synthesis_draft,
    course_role = excluded.course_role,
    identity_state = excluded.identity_state,
    review_state = excluded.review_state,
    candidate_class = excluded.candidate_class,
    evidence_keys = excluded.evidence_keys,
    metadata = excluded.metadata;

  get diagnostics v_upserted_count = row_count;
  if v_upserted_count <> v_entity_count then
    raise exception 'Entity upsert count mismatch: expected %, received %',
      v_entity_count, v_upserted_count;
  end if;

  insert into public.course_graph_edges (
    import_id,
    stable_id,
    source_entity_id,
    target_entity_id,
    predicate,
    edge_class,
    epistemic_kind,
    scope,
    confidence,
    weight,
    connection_summary_draft,
    review_state,
    candidate_class,
    evidence_keys,
    metadata
  )
  select
    v_import_id,
    item->>'stable_id',
    source_entity.id,
    target_entity.id,
    item->>'predicate',
    item->>'edge_class',
    item->>'epistemic_kind',
    nullif(item->>'scope', ''),
    item->>'confidence',
    case
      when item->'weight' is null or item->'weight' = 'null'::jsonb then null
      else (item->>'weight')::numeric
    end,
    item->>'connection_summary',
    item->>'review_state',
    item->>'candidate_class',
    coalesce(
      array(select jsonb_array_elements_text(coalesce(item->'evidence_keys', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(item->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_bundle->'edges') item
  join public.course_graph_entities source_entity
    on source_entity.import_id = v_import_id
   and source_entity.stable_id = item->>'source_stable_id'
  join public.course_graph_entities target_entity
    on target_entity.import_id = v_import_id
   and target_entity.stable_id = item->>'target_stable_id'
  on conflict (import_id, stable_id) do update set
    source_entity_id = excluded.source_entity_id,
    target_entity_id = excluded.target_entity_id,
    predicate = excluded.predicate,
    edge_class = excluded.edge_class,
    epistemic_kind = excluded.epistemic_kind,
    scope = excluded.scope,
    confidence = excluded.confidence,
    weight = excluded.weight,
    connection_summary_draft = excluded.connection_summary_draft,
    review_state = excluded.review_state,
    candidate_class = excluded.candidate_class,
    evidence_keys = excluded.evidence_keys,
    metadata = excluded.metadata;

  get diagnostics v_upserted_count = row_count;
  if v_upserted_count <> v_edge_count then
    raise exception 'Edge upsert count mismatch: expected %, received %',
      v_edge_count, v_upserted_count;
  end if;

  insert into public.course_graph_blocked_inferences (
    import_id,
    proposal,
    reason,
    evidence_keys
  )
  select
    v_import_id,
    item->>'proposal',
    item->>'reason',
    coalesce(
      array(select jsonb_array_elements_text(coalesce(item->'evidence_keys', '[]'::jsonb))),
      '{}'::text[]
    )
  from jsonb_array_elements(coalesce(p_bundle->'blocked_inferences', '[]'::jsonb)) item
  on conflict (import_id, proposal) do update set
    reason = excluded.reason,
    evidence_keys = excluded.evidence_keys;

  get diagnostics v_upserted_count = row_count;
  if v_upserted_count <> v_blocked_count then
    raise exception 'Blocked-inference upsert count mismatch: expected %, received %',
      v_blocked_count, v_upserted_count;
  end if;

  -- Exact-sync only this candidate import. Canonical/legacy graph tables are
  -- deliberately untouched.
  delete from public.course_graph_edges stored
  where stored.import_id = v_import_id
    and not exists (
      select 1
      from jsonb_array_elements(p_bundle->'edges') item
      where item->>'stable_id' = stored.stable_id
    );

  delete from public.course_graph_blocked_inferences stored
  where stored.import_id = v_import_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_bundle->'blocked_inferences', '[]'::jsonb)) item
      where item->>'proposal' = stored.proposal
    );

  delete from public.course_graph_entities stored
  where stored.import_id = v_import_id
    and not exists (
      select 1
      from jsonb_array_elements(p_bundle->'entities') item
      where item->>'stable_id' = stored.stable_id
    );

  delete from public.course_graph_evidence stored
  where stored.import_id = v_import_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_bundle->'evidence', '[]'::jsonb)) item
      where item->>'evidence_key' = stored.evidence_key
    );

  return jsonb_build_object(
    'import_id', v_import_id,
    'bundle_slug', p_bundle->>'bundle_slug',
    'review_state', 'candidate',
    'evidence', v_evidence_count,
    'entities', v_entity_count,
    'edges', v_edge_count,
    'blocked_inferences', v_blocked_count
  );
end;
$$;

alter table public.course_graph_imports enable row level security;
alter table public.course_graph_evidence enable row level security;
alter table public.course_graph_entities enable row level security;
alter table public.course_graph_edges enable row level security;
alter table public.course_graph_blocked_inferences enable row level security;

drop policy if exists "Authenticated reviewers can read course graph imports"
  on public.course_graph_imports;
create policy "Authenticated reviewers can read course graph imports"
  on public.course_graph_imports for select to authenticated using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

drop policy if exists "Authenticated reviewers can read course graph evidence"
  on public.course_graph_evidence;
create policy "Authenticated reviewers can read course graph evidence"
  on public.course_graph_evidence for select to authenticated using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

drop policy if exists "Authenticated reviewers can read course graph entities"
  on public.course_graph_entities;
create policy "Authenticated reviewers can read course graph entities"
  on public.course_graph_entities for select to authenticated using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

drop policy if exists "Authenticated reviewers can read course graph edges"
  on public.course_graph_edges;
create policy "Authenticated reviewers can read course graph edges"
  on public.course_graph_edges for select to authenticated using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

drop policy if exists "Authenticated reviewers can read blocked graph inferences"
  on public.course_graph_blocked_inferences;
create policy "Authenticated reviewers can read blocked graph inferences"
  on public.course_graph_blocked_inferences for select to authenticated using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

grant select on public.course_graph_imports to authenticated;
grant select on public.course_graph_evidence to authenticated;
grant select on public.course_graph_entities to authenticated;
grant select on public.course_graph_edges to authenticated;
grant select on public.course_graph_blocked_inferences to authenticated;

grant all on public.course_graph_imports to service_role;
grant all on public.course_graph_evidence to service_role;
grant all on public.course_graph_entities to service_role;
grant all on public.course_graph_edges to service_role;
grant all on public.course_graph_blocked_inferences to service_role;

revoke all on function public.import_course_graph_candidate(jsonb)
  from public, anon, authenticated;
grant execute on function public.import_course_graph_candidate(jsonb)
  to service_role;

comment on table public.course_graph_imports is
  'Review-only course graph candidate manifests. Rows are not canonical graph promotion.';
comment on table public.course_graph_entities is
  'Typed course/work/person/concept/etc. candidate nodes with draft synthesis and review state.';
comment on table public.course_graph_edges is
  'Directed candidate edges with predicate, epistemic kind, evidence, and draft connection summary.';
comment on function public.import_course_graph_candidate(jsonb) is
  'Atomically validates and exact-syncs one lossless course graph candidate manifest without touching legacy or canonical graph tables.';
