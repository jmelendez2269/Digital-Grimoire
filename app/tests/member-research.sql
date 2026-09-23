\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
('91000000-0000-4000-8000-000000000001','research-owner-a@example.test'),
('91000000-0000-4000-8000-000000000002','research-owner-b@example.test');
insert into public.users(id,email,role) values
('91000000-0000-4000-8000-000000000001','research-owner-a@example.test','user'),
('91000000-0000-4000-8000-000000000002','research-owner-b@example.test','user')
on conflict(id) do update set role = 'user';
insert into public.research_inquiries(id,owner_id,title) values
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Private A'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','Private B');
insert into public.research_entities(id,created_by,name,kind,definition) values
('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Shared spelling','concept','PRIVATE A'),
('93000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','Shared spelling','concept','PRIVATE B');
insert into public.research_findings(id,inquiry_id,title,source_kind,source_entity_id) values
('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','First','note','93000000-0000-4000-8000-000000000001'),
('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','Second','note',null);
do $$
declare original bigint;
begin
  if has_table_privilege('authenticated','public.research_entities','select') or
     has_table_privilege('anon','public.research_discoveries','select') then raise exception 'Private tables exposed'; end if;
  if has_function_privilege('authenticated','public.transition_research_finding(uuid,uuid,integer,text)','execute') then raise exception 'Publication RPC exposed'; end if;
  begin
    update public.research_findings set source_entity_id = '93000000-0000-4000-8000-000000000002' where id = '94000000-0000-4000-8000-000000000001';
    raise exception 'Cross-owner entry accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.research_findings set status = 'reviewed' where id = '94000000-0000-4000-8000-000000000001';
    raise exception 'Member review accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.transition_research_finding('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',1,'publish');
    raise exception 'Member publication accepted';
  exception when insufficient_privilege then null; end;
  select sort_order into original from public.research_findings where id = '94000000-0000-4000-8000-000000000002';
  perform public.move_research_finding('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','down');
  if (select sort_order from public.research_findings where id = '94000000-0000-4000-8000-000000000001') <> original then raise exception 'Member ordering failed'; end if;
  begin
    perform public.move_research_finding('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','up');
    raise exception 'Other owner reordered findings';
  exception when no_data_found then null; end;
end $$;
rollback;
