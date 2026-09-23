-- Private concept identities belong to a researcher. Published projections stay
-- explicit, and publication still requires the existing curator-only RPC.
drop index public.research_entity_identity;
alter table public.research_entities drop constraint research_entities_correspondence_id_key;
create unique index research_entity_identity on public.research_entities(created_by, kind, lower(trim(name)));
create unique index research_entity_correspondence on public.research_entities(created_by, correspondence_id);

-- Preserve earlier inquiries which reused another curator's entry by copying
-- that entry into the inquiry owner's namespace before enforcing ownership.
do $$
declare r record; local_id uuid;
begin
  for r in
    select distinct ri.owner_id, e.* from public.research_findings f
    join public.research_inquiries ri on ri.id = f.inquiry_id
    join public.research_entities e on e.id in (f.source_entity_id, f.target_entity_id)
    where e.created_by <> ri.owner_id
  loop
    select id into local_id from public.research_entities
      where created_by = r.owner_id and
      ((kind = r.kind and lower(trim(name)) = lower(trim(r.name))) or
       (r.correspondence_id is not null and correspondence_id = r.correspondence_id)) limit 1;
    if local_id is null then
      insert into public.research_entities(name,kind,definition,correspondence_id,created_by)
      values(r.name,r.kind,r.definition,r.correspondence_id,r.owner_id) returning id into local_id;
    end if;
    update public.research_findings f set
      source_entity_id = case when source_entity_id = r.id then local_id else source_entity_id end,
      target_entity_id = case when target_entity_id = r.id then local_id else target_entity_id end
    from public.research_inquiries ri where ri.id = f.inquiry_id and ri.owner_id = r.owner_id
      and r.id in (f.source_entity_id, f.target_entity_id);
  end loop;
end $$;

create function public.check_research_finding_owner() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select owner_id into owner from public.research_inquiries where id = new.inquiry_id;
  if exists (select 1 from public.research_entities where id in (new.source_entity_id,new.target_entity_id) and created_by <> owner) then
    raise exception 'Entry belongs to another researcher' using errcode = '42501';
  end if;
  if new.status <> 'draft' and not exists (select 1 from public.users where id = owner and role = 'admin') then
    raise exception 'Only curator findings may be reviewed or published' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger research_finding_owner before insert or update on public.research_findings
for each row execute function public.check_research_finding_owner();

create or replace function public.move_research_finding(p_id uuid, p_owner uuid, p_direction text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare f public.research_findings; neighbor public.research_findings;
begin
  if p_direction not in ('up','down') then raise exception 'Invalid direction'; end if;
  perform 1 from public.research_inquiries ri join public.research_findings rf on rf.inquiry_id = ri.id
    where rf.id = p_id and ri.owner_id = p_owner for update of ri;
  if not found then raise exception 'Finding not found' using errcode = 'P0002'; end if;
  select * into f from public.research_findings where id = p_id;
  select * into neighbor from public.research_findings where inquiry_id = f.inquiry_id and
    ((p_direction = 'up' and sort_order < f.sort_order) or (p_direction = 'down' and sort_order > f.sort_order))
    order by case when p_direction = 'up' then -sort_order else sort_order end limit 1;
  if found then
    update public.research_findings set sort_order = neighbor.sort_order where id = f.id;
    update public.research_findings set sort_order = f.sort_order where id = neighbor.id;
  end if;
end $$;

-- Retain restrictive RLS and service-only writes; routes authenticate the actor.
revoke all on function public.check_research_finding_owner() from public, anon, authenticated;
