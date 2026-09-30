\set ON_ERROR_STOP on
begin;
insert into auth.users(id, email) values
('a1111111-1111-4111-8111-111111111111', 'inquiry-sql-admin@example.test'),
('a2222222-2222-4222-8222-222222222222', 'inquiry-sql-other@example.test');
insert into public.users(id, email, role) values
('a1111111-1111-4111-8111-111111111111', 'inquiry-sql-admin@example.test', 'admin'),
('a2222222-2222-4222-8222-222222222222', 'inquiry-sql-other@example.test', 'admin')
on conflict (id) do update set role = 'admin';
insert into public.research_inquiries(id, owner_id, title, notes) values
('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'SQL verification', 'PRIVATE');
insert into public.research_entities(id, name, kind, created_by) values
('c1111111-1111-4111-8111-111111111111','SQL source work','work','a1111111-1111-4111-8111-111111111111'),
('c2222222-2222-4222-8222-222222222222','SQL concept','concept','a1111111-1111-4111-8111-111111111111');
insert into public.research_findings(id,inquiry_id,title,claim,source_kind,source_title,source_url,source_locator,excerpt,context,source_entity_id,target_entity_id) values
('d1111111-1111-4111-8111-111111111111','b1111111-1111-4111-8111-111111111111','Verified connection','Specific claim','external','Source','https://example.org/source','Illustration 20','Image description','This witness only','c1111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222'),
('d2222222-2222-4222-8222-222222222222','b1111111-1111-4111-8111-111111111111','AI lead','Specific claim','ai','AI answer','','No source','Generated text','Unverified','c1111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222');
do $$
declare f public.research_findings; original_order bigint;
begin
  if has_table_privilege('anon','public.research_findings','select') or has_table_privilege('authenticated','public.research_inquiries','select') then raise exception 'Private table exposed'; end if;
  if has_function_privilege('authenticated','public.transition_research_finding(uuid,uuid,integer,text)','execute') then raise exception 'Transition exposed'; end if;
  begin
    perform public.transition_research_finding('d1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222',1,'review');
    raise exception 'Cross-owner review accepted';
  exception when no_data_found then null; end;
  begin
    perform public.transition_research_finding('d2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111',1,'review');
    raise exception 'AI lead reviewed without evidence';
  exception when check_violation then null; end;
  begin
    perform public.transition_research_finding('d1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111',1,'publish');
    raise exception 'Unreviewed publication accepted';
  exception when invalid_parameter_value then null; end;
  f := public.transition_research_finding('d1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111',1,'review');
  if f.status <> 'reviewed' or f.revision <> 2 then raise exception 'Review failed'; end if;
  begin
    perform public.transition_research_finding(f.id,'a1111111-1111-4111-8111-111111111111',1,'publish');
    raise exception 'Stale publication accepted';
  exception when serialization_failure then null; end;
  f := public.transition_research_finding(f.id,'a1111111-1111-4111-8111-111111111111',2,'publish');
  if f.published_at is null or f.status <> 'published' then raise exception 'Publication failed'; end if;
  f := public.transition_research_finding(f.id,'a1111111-1111-4111-8111-111111111111',3,'draft');
  if f.published_at is not null or f.reviewed_at is not null then raise exception 'Unpublish failed'; end if;
  select sort_order into original_order from public.research_findings where id = f.id;
  perform public.move_research_finding(f.id,'a1111111-1111-4111-8111-111111111111','down');
  if (select sort_order from public.research_findings where id = f.id) <= original_order then raise exception 'Ordering failed'; end if;
end $$;
rollback;
\echo 'Inquiry database authorization, review, publication, stale revision, and ordering checks passed.'
