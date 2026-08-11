\set ON_ERROR_STOP on
\pset pager off

\if :{?prismarium_target}
\else
  \echo 'LEAN_L0_02_GUARD_FAILED: prismarium_target is required'
  \quit 2
\endif

select :'prismarium_target' in ('local', 'staging') as lean_l0_02_target_allowed \gset
\if :lean_l0_02_target_allowed
\else
  \echo 'LEAN_L0_02_GUARD_FAILED: target must be local or staging; production is disabled'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
set local idle_in_transaction_session_timeout = '120s';
select pg_advisory_xact_lock(hashtext('prismarium-lean-l0-02-authorization-baseline'));

select
  gen_random_uuid() as run_id,
  gen_random_uuid() as actor_id,
  gen_random_uuid() as other_id,
  gen_random_uuid() as course_id,
  gen_random_uuid() as text_id,
  gen_random_uuid() as enrollment_id,
  gen_random_uuid() as cache_id,
  gen_random_uuid() as usage_id,
  gen_random_uuid() as provider_usage_id,
  gen_random_uuid() as cover_job_id,
  gen_random_uuid() as tradition_id,
  gen_random_uuid() as source_concept_id,
  gen_random_uuid() as target_concept_id,
  gen_random_uuid() as relationship_id,
  gen_random_uuid() as entity_type_id,
  gen_random_uuid() as relationship_type_id,
  gen_random_uuid() as knowledge_source_id,
  gen_random_uuid() as knowledge_claim_id
\gset

select
  'lean-l0-02-a-' || replace(:'run_id', '-', '') || '@example.invalid' as actor_email,
  'lean-l0-02-b-' || replace(:'run_id', '-', '') || '@example.invalid' as other_email,
  'lean-l0-02-' || replace(:'run_id', '-', '') as marker
\gset

create temporary table lean_l0_02_results (
  sequence bigint generated always as identity,
  category text not null,
  surface text not null,
  actor text not null,
  operation text not null,
  secure_expectation text not null check (secure_expectation in ('allowed', 'denied')),
  observed text not null check (observed in ('allowed', 'denied', 'error')),
  security_result text not null check (security_result in ('PASS', 'FAIL', 'INCONCLUSIVE')),
  sqlstate text,
  detail text not null
) on commit drop;

grant insert, select on table pg_temp.lean_l0_02_results to anon, authenticated;
grant usage, select on sequence pg_temp.lean_l0_02_results_sequence_seq to anon, authenticated;

create function pg_temp.lean_l0_02_probe(
  p_category text,
  p_surface text,
  p_actor text,
  p_operation text,
  p_secure_expectation text,
  p_statement text,
  p_zero_rows_means_denied boolean default false
) returns void
language plpgsql
as $probe$
declare
  affected_rows bigint := 0;
  observed_result text;
  result_status text;
  error_state text;
begin
  begin
    execute p_statement;
    get diagnostics affected_rows = row_count;
    observed_result := case
      when p_zero_rows_means_denied and affected_rows = 0 then 'denied'
      else 'allowed'
    end;
    result_status := case
      when observed_result = p_secure_expectation then 'PASS'
      else 'FAIL'
    end;

    insert into pg_temp.lean_l0_02_results (
      category,
      surface,
      actor,
      operation,
      secure_expectation,
      observed,
      security_result,
      sqlstate,
      detail
    ) values (
      p_category,
      p_surface,
      p_actor,
      p_operation,
      p_secure_expectation,
      observed_result,
      result_status,
      null,
      'statement completed; affected_rows=' || affected_rows
    );
  exception
    when insufficient_privilege then
      observed_result := 'denied';
      result_status := case
        when p_secure_expectation = 'denied' then 'PASS'
        else 'FAIL'
      end;

      insert into pg_temp.lean_l0_02_results (
        category,
        surface,
        actor,
        operation,
        secure_expectation,
        observed,
        security_result,
        sqlstate,
        detail
      ) values (
        p_category,
        p_surface,
        p_actor,
        p_operation,
        p_secure_expectation,
        observed_result,
        result_status,
        sqlstate,
        'authorization rejected the statement'
      );
    when others then
      get stacked diagnostics error_state = returned_sqlstate;
      insert into pg_temp.lean_l0_02_results (
        category,
        surface,
        actor,
        operation,
        secure_expectation,
        observed,
        security_result,
        sqlstate,
        detail
      ) values (
        p_category,
        p_surface,
        p_actor,
        p_operation,
        p_secure_expectation,
        'error',
        'INCONCLUSIVE',
        error_state,
        'unexpected SQL error; message suppressed for privacy'
      );
  end;
end;
$probe$;

grant execute on function pg_temp.lean_l0_02_probe(
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to anon, authenticated;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    :'actor_id',
    'authenticated',
    'authenticated',
    :'actor_email',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L0-02 fixture A"}'::jsonb,
    now(),
    now()
  ),
  (
    :'other_id',
    'authenticated',
    'authenticated',
    :'other_email',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"LEAN L0-02 fixture B"}'::jsonb,
    now(),
    now()
  );

insert into public.courses (id, title, slug, is_published, content, sort_order)
values (
  :'course_id',
  'LEAN L0-02 synthetic course',
  :'marker' || '-course',
  true,
  '{"fixture":true}'::jsonb,
  0
);

insert into public.texts (id, title)
values (:'text_id', 'LEAN L0-02 synthetic text');

insert into public.course_texts (
  id,
  course_id,
  text_id,
  week_number,
  selection_notes,
  details
) values (
  gen_random_uuid(),
  :'course_id',
  :'text_id',
  1,
  'synthetic preview metadata',
  'synthetic protected curriculum detail'
);

set local "request.jwt.claim.sub" = :'actor_id';
set local "request.jwt.claim.role" = 'authenticated';
set local "lean.other_id" = :'other_id';
set local role authenticated;

select pg_temp.lean_l0_02_probe(
  'cross-account',
  'public.users',
  'authenticated fixture A',
  'read fixture B profile',
  'denied',
  format('select id from public.users where id = %L::uuid', current_setting('lean.other_id', true)),
  true
);

reset role;
set local role authenticated;

select pg_temp.lean_l0_02_probe(
  'cross-account',
  'public.users',
  'authenticated fixture A',
  'update fixture B role',
  'denied',
  format(
    'update public.users set role = %L where id = %L::uuid',
    'admin',
    current_setting('lean.other_id')
  ),
  true
);

select pg_temp.lean_l0_02_probe(
  'enrollment-authority',
  'public.course_enrollments',
  'authenticated fixture A',
  'self-enroll with forged progress and completion',
  'denied',
  format(
    'insert into public.course_enrollments (id, user_id, course_id, current_week, current_cycle, progress, completed_at) values (%L::uuid, %L::uuid, %L::uuid, 99, 9, %L::jsonb, now())',
    :'enrollment_id',
    :'actor_id',
    :'course_id',
    '{"synthetic":true,"percent":100}'
  )
);

select pg_temp.lean_l0_02_probe(
  'enrollment-authority',
  'public.course_enrollments',
  'authenticated fixture A',
  'rewrite own access progress state',
  'denied',
  format(
    'update public.course_enrollments set current_week = 100, current_cycle = 10, progress = %L::jsonb where id = %L::uuid',
    '{"synthetic":true,"percent":999}',
    :'enrollment_id'
  )
);

select pg_temp.lean_l0_02_probe(
  'shared-cache',
  'public.search_cache',
  'authenticated fixture A',
  'insert shared synthetic cache result',
  'denied',
  format(
    'insert into public.search_cache (id, query, results) values (%L::uuid, %L, %L::jsonb)',
    :'cache_id',
    :'marker' || '-query',
    '{"synthetic":true}'
  )
);

select pg_temp.lean_l0_02_probe(
  'usage-authority',
  'public.api_usage',
  'authenticated fixture A',
  'forge usage and cost evidence',
  'denied',
  format(
    'insert into public.api_usage (id, service, endpoint, operation, units_used, unit_type, estimated_cost, user_id, request_metadata, success) values (%L::uuid, %L, %L, %L, 2, %L, 1.23, %L::uuid, %L::jsonb, true)',
    :'usage_id',
    'other',
    'lean-l0-02-fixture',
    'authorization-baseline',
    'requests',
    :'actor_id',
    '{"synthetic":true}'
  )
);

select pg_temp.lean_l0_02_probe(
  'usage-authority',
  'public.provider_daily_usage',
  'authenticated fixture A',
  'forge provider cost aggregate',
  'denied',
  format(
    'insert into public.provider_daily_usage (id, date, provider, model, input_tokens, output_tokens, requests, cost) values (%L::uuid, current_date, %L, %L, 999999, 999999, 999999, 999999)',
    :'provider_usage_id',
    'synthetic-provider',
    'synthetic-model'
  )
);

select pg_temp.lean_l0_02_probe(
  'pre-credit-authority',
  'public.cover_generation_jobs.credits_used',
  'authenticated fixture A',
  'create job with forged credit usage',
  'denied',
  format(
    'insert into public.cover_generation_jobs (id, text_id, status, source, credits_used) values (%L::uuid, %L::uuid, %L, %L, 999999)',
    :'cover_job_id',
    :'text_id',
    'pending',
    'lean-l0-02-fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'curriculum-boundary',
  'public.courses preview columns',
  'authenticated fixture A',
  'read published preview metadata',
  'allowed',
  format('select id, title, slug from public.courses where id = %L::uuid', :'course_id')
);

select pg_temp.lean_l0_02_probe(
  'curriculum-boundary',
  'public.courses.content',
  'authenticated fixture A',
  'read protected course content',
  'denied',
  format('select content from public.courses where id = %L::uuid', :'course_id')
);

select pg_temp.lean_l0_02_probe(
  'curriculum-boundary',
  'public.course_texts preview columns',
  'authenticated fixture A',
  'read course-text preview metadata',
  'allowed',
  format('select id, course_id, text_id, week_number from public.course_texts where course_id = %L::uuid', :'course_id')
);

select pg_temp.lean_l0_02_probe(
  'curriculum-boundary',
  'public.course_texts.details',
  'authenticated fixture A',
  'read protected course-text details',
  'denied',
  format('select details from public.course_texts where course_id = %L::uuid', :'course_id')
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.convergence_traditions',
  'authenticated fixture A',
  'insert shared taxonomy row',
  'denied',
  format(
    'insert into public.convergence_traditions (id, slug, label, description) values (%L::uuid, %L, %L, %L)',
    :'tradition_id',
    :'marker' || '-tradition',
    'LEAN L0-02 tradition',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.convergence_concepts',
  'authenticated fixture A',
  'insert shared concept rows',
  'denied',
  format(
    'insert into public.convergence_concepts (id, slug, name, tradition, tradition_id, short_definition) values (%L::uuid, %L, %L, %L, %L::uuid, %L), (%L::uuid, %L, %L, %L, %L::uuid, %L)',
    :'source_concept_id',
    :'marker' || '-concept-a',
    'LEAN L0-02 concept A',
    'convergence',
    :'tradition_id',
    'synthetic fixture',
    :'target_concept_id',
    :'marker' || '-concept-b',
    'LEAN L0-02 concept B',
    'convergence',
    :'tradition_id',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.convergence_relationships',
  'authenticated fixture A',
  'insert shared relationship row',
  'denied',
  format(
    'insert into public.convergence_relationships (id, source_id, target_id, similarity, notes) values (%L::uuid, %L::uuid, %L::uuid, 1, %L)',
    :'relationship_id',
    :'source_concept_id',
    :'target_concept_id',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.correspondence_entity_types',
  'authenticated fixture A',
  'insert shared entity type',
  'denied',
  format(
    'insert into public.correspondence_entity_types (id, slug, label, description) values (%L::uuid, %L, %L, %L)',
    :'entity_type_id',
    :'marker' || '-entity-type',
    'LEAN L0-02 entity type',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.correspondence_relationship_types',
  'authenticated fixture A',
  'insert shared relationship type',
  'denied',
  format(
    'insert into public.correspondence_relationship_types (id, slug, label, description) values (%L::uuid, %L, %L, %L)',
    :'relationship_type_id',
    :'marker' || '-relationship-type',
    'LEAN L0-02 relationship type',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.knowledge_sources',
  'authenticated fixture A',
  'insert shared knowledge source',
  'denied',
  format(
    'insert into public.knowledge_sources (id, title, author, notes) values (%L::uuid, %L, %L, %L)',
    :'knowledge_source_id',
    'LEAN L0-02 synthetic source',
    'Synthetic fixture',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'rls-disabled-table',
  'public.knowledge_claims',
  'authenticated fixture A',
  'insert shared knowledge claim',
  'denied',
  format(
    'insert into public.knowledge_claims (id, entity_type, entity_id, source_id, field_key, field_value, confidence, notes) values (%L::uuid, %L, %L::uuid, %L::uuid, %L, %L, %L, %L)',
    :'knowledge_claim_id',
    'convergence',
    :'source_concept_id',
    :'knowledge_source_id',
    'lean-l0-02',
    'synthetic fixture',
    'low',
    'synthetic fixture'
  )
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_affiliate_source_stats()',
  'authenticated fixture A',
  'execute aggregate RPC',
  'denied',
  'select * from public.get_affiliate_source_stats() limit 1'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_indexed_text_ids()',
  'authenticated fixture A',
  'execute indexing RPC',
  'denied',
  'select * from public.get_indexed_text_ids() limit 1'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_library_indexing_summary()',
  'authenticated fixture A',
  'execute library summary RPC',
  'denied',
  'select public.get_library_indexing_summary()'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_text_chunk_counts(uuid[])',
  'authenticated fixture A',
  'execute chunk-count RPC',
  'denied',
  'select * from public.get_text_chunk_counts(array[]::uuid[])'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_top_affiliate_items(integer)',
  'authenticated fixture A',
  'execute affiliate ranking RPC',
  'denied',
  'select * from public.get_top_affiliate_items(1)'
);

reset role;
set local role anon;

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_affiliate_source_stats()',
  'anonymous API role',
  'execute aggregate RPC',
  'denied',
  'select * from public.get_affiliate_source_stats() limit 1'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_indexed_text_ids()',
  'anonymous API role',
  'execute indexing RPC',
  'denied',
  'select * from public.get_indexed_text_ids() limit 1'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_library_indexing_summary()',
  'anonymous API role',
  'execute library summary RPC',
  'denied',
  'select public.get_library_indexing_summary()'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_text_chunk_counts(uuid[])',
  'anonymous API role',
  'execute chunk-count RPC',
  'denied',
  'select * from public.get_text_chunk_counts(array[]::uuid[])'
);

select pg_temp.lean_l0_02_probe(
  'security-definer-rpc',
  'public.get_top_affiliate_items(integer)',
  'anonymous API role',
  'execute affiliate ranking RPC',
  'denied',
  'select * from public.get_top_affiliate_items(1)'
);

reset role;
set local role authenticated;

select pg_temp.lean_l0_02_probe(
  'protected-user-fields',
  'public.users.tokens_earned',
  'authenticated fixture A',
  'forge own token balance',
  'denied',
  format('update public.users set tokens_earned = 999999 where id = %L::uuid', :'actor_id'),
  true
);

select pg_temp.lean_l0_02_probe(
  'protected-user-fields',
  'public.users.subscription_status',
  'authenticated fixture A',
  'forge own subscription tier',
  'denied',
  format('update public.users set subscription_status = %L where id = %L::uuid', 'scholar', :'actor_id'),
  true
);

select pg_temp.lean_l0_02_probe(
  'protected-user-fields',
  'public.users Stripe references',
  'authenticated fixture A',
  'forge own billing references',
  'denied',
  format(
    'update public.users set stripe_customer_id = %L, stripe_subscription_id = %L where id = %L::uuid',
    'synthetic-customer-reference',
    'synthetic-subscription-reference',
    :'actor_id'
  ),
  true
);

select pg_temp.lean_l0_02_probe(
  'protected-user-fields',
  'public.users subscription dates',
  'authenticated fixture A',
  'forge own subscription and trial dates',
  'denied',
  format(
    'update public.users set subscription_start_date = now(), subscription_end_date = now() + interval %L, trial_started_at = now() where id = %L::uuid',
    '10 years',
    :'actor_id'
  ),
  true
);

select pg_temp.lean_l0_02_probe(
  'protected-user-fields',
  'public.users.role',
  'authenticated fixture A',
  'escalate own role to admin',
  'denied',
  format('update public.users set role = %L where id = %L::uuid', 'admin', :'actor_id'),
  true
);

reset role;

insert into pg_temp.lean_l0_02_results (
  category,
  surface,
  actor,
  operation,
  secure_expectation,
  observed,
  security_result,
  sqlstate,
  detail
)
select
  'security-definer-grant',
  p.oid::regprocedure::text,
  role_name,
  'hold EXECUTE privilege on SECURITY DEFINER function',
  'denied',
  case when has_function_privilege(role_name, p.oid, 'EXECUTE') then 'allowed' else 'denied' end,
  case when has_function_privilege(role_name, p.oid, 'EXECUTE') then 'FAIL' else 'PASS' end,
  null,
  'catalog privilege check; no function arguments or returned data recorded'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated')) as roles(role_name)
where n.nspname = 'public'
  and p.prosecdef
order by p.oid::regprocedure::text, role_name;

select
  :'prismarium_target' as target,
  count(*) as probes,
  count(*) filter (where security_result = 'PASS') as secure_passes,
  count(*) filter (where security_result = 'FAIL') as security_failures,
  count(*) filter (where security_result = 'INCONCLUSIVE') as inconclusive
from pg_temp.lean_l0_02_results;

select
  sequence,
  category,
  surface,
  actor,
  operation,
  secure_expectation,
  observed,
  security_result,
  coalesce(sqlstate, '-') as sqlstate,
  detail
from pg_temp.lean_l0_02_results
order by sequence;

rollback;

select
  (
    (select count(*) from auth.users where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
    (select count(*) from public.users where id in (:'actor_id'::uuid, :'other_id'::uuid)) +
    (select count(*) from public.courses where id = :'course_id'::uuid) +
    (select count(*) from public.texts where id = :'text_id'::uuid) +
    (select count(*) from public.course_enrollments where id = :'enrollment_id'::uuid) +
    (select count(*) from public.search_cache where id = :'cache_id'::uuid) +
    (select count(*) from public.api_usage where id = :'usage_id'::uuid) +
    (select count(*) from public.provider_daily_usage where id = :'provider_usage_id'::uuid) +
    (select count(*) from public.cover_generation_jobs where id = :'cover_job_id'::uuid) +
    (select count(*) from public.convergence_traditions where id = :'tradition_id'::uuid) +
    (select count(*) from public.convergence_concepts where id in (:'source_concept_id'::uuid, :'target_concept_id'::uuid)) +
    (select count(*) from public.convergence_relationships where id = :'relationship_id'::uuid) +
    (select count(*) from public.correspondence_entity_types where id = :'entity_type_id'::uuid) +
    (select count(*) from public.correspondence_relationship_types where id = :'relationship_type_id'::uuid) +
    (select count(*) from public.knowledge_sources where id = :'knowledge_source_id'::uuid) +
    (select count(*) from public.knowledge_claims where id = :'knowledge_claim_id'::uuid)
  ) as cleanup_residue;
