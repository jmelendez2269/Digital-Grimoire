-- Create storage bucket for journal images
insert into storage.buckets (id, name, public)
values ('journal-images', 'journal-images', false)
on conflict (id) do nothing;

-- Policy: only authenticated users can upload to their own folder
create policy "journal images upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: allow read via signed URLs only (no public read)
create policy "journal images read via select for signed url"
on storage.objects for select to authenticated
using (
  bucket_id = 'journal-images'
);

-- Optional: allow owners to delete their own files
create policy "journal images delete own files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Add slug to journal_pages if not exists
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_pages' and column_name = 'slug'
  ) then
    alter table public.journal_pages
      add column slug text;
    create unique index if not exists journal_pages_user_slug_unique
      on public.journal_pages (user_id, slug);
  end if;
end $$;

-- Backlinks helper index (for simple text search of [[slug]])
create index if not exists journal_pages_content_gin_trgm
on public.journal_pages using gin ((content::text) gin_trgm_ops);


