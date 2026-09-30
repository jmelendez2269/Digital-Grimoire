-- Concept Search discovers published inquiry knowledge and the existing
-- correspondence archive. Private draft identities are excluded before limiting.
create function public.search_knowledge_suggestions(p_query text, p_limit integer default 8)
returns table(id uuid, name text, slug text, kind text, origin text)
language sql stable security invoker set search_path = public, pg_temp as $$
  select candidate.id, candidate.name, candidate.id::text, candidate.kind, candidate.origin
  from (
    select e.id, e.name, e.kind, 'Published finding'::text as origin, 0 as priority
    from public.research_entities e
    where length(trim(p_query)) >= 2 and position(lower(trim(p_query)) in lower(e.name)) > 0
      and exists (select 1 from public.research_findings f where f.status = 'published'
        and (f.source_entity_id = e.id or f.target_entity_id = e.id))
    union all
    select c.id, c.name, c.category, 'Correspondence'::text, 1
    from public.correspondences c
    where length(trim(p_query)) >= 2 and position(lower(trim(p_query)) in lower(c.name)) > 0
      and not exists (select 1 from public.research_entities e where e.correspondence_id = c.id
        and exists (select 1 from public.research_findings f where f.status = 'published'
          and (f.source_entity_id = e.id or f.target_entity_id = e.id)))
  ) candidate
  order by case when lower(candidate.name) = lower(trim(p_query)) then 0 else 1 end,
    candidate.priority, candidate.name, candidate.id
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;
revoke all on function public.search_knowledge_suggestions(text,integer) from public, anon, authenticated;
grant execute on function public.search_knowledge_suggestions(text,integer) to service_role;
