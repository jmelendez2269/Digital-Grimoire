-- Per-entity narrative summary draft/approval workflow.
--
-- Mirrors the reading_blurbs draft -> review -> live pattern, but lives
-- directly on the correspondences row so the graph dossier can render
-- the approved narrative inline.
--
-- description       = the approved, user-facing narrative (existing column)
-- narrative_draft   = LLM-generated draft awaiting human approval
-- narrative_status  = 'missing' | 'draft' | 'approved'
-- narrative_source  = 'corpus' | 'structured' — which drafting path produced it

alter table public.correspondences
  add column if not exists narrative_draft text,
  add column if not exists narrative_status text not null default 'missing',
  add column if not exists narrative_source text;

alter table public.correspondences
  drop constraint if exists correspondences_narrative_status_check;
alter table public.correspondences
  add constraint correspondences_narrative_status_check
    check (narrative_status in ('missing', 'draft', 'approved'));

alter table public.correspondences
  drop constraint if exists correspondences_narrative_source_check;
alter table public.correspondences
  add constraint correspondences_narrative_source_check
    check (narrative_source is null or narrative_source in ('corpus', 'structured'));

-- Backfill: any row that already has a description is treated as approved.
update public.correspondences
   set narrative_status = 'approved'
 where narrative_status = 'missing'
   and description is not null
   and length(trim(description)) > 0;

create index if not exists idx_correspondences_narrative_status
  on public.correspondences(narrative_status);

comment on column public.correspondences.narrative_draft is
  'LLM-generated draft narrative awaiting human approval. Promoted to description on approval.';
comment on column public.correspondences.narrative_status is
  'Workflow state for the narrative summary: missing | draft | approved.';
comment on column public.correspondences.narrative_source is
  'Which drafting path produced the current draft: corpus (grounded in texts) or structured (graph associations only).';
