-- Sync display identity (name, avatar) from auth.users metadata into public.users
-- on every profile edit, not just at signup. Previously handle_user_update() only
-- synced email/email_verified, so edits made via the profile page (which write to
-- auth.users.raw_user_meta_data through supabase.auth.updateUser) never propagated
-- to public.users -- leaving chat/forum authorship with nothing real to display.
--
-- This re-declares the trigger pair from the untracked repo-root
-- migrations/002_auto_create_user_profiles.sql so the tracked migration history
-- is self-contained, and extends both functions to also sync name/image.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, image, email_verified, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email_confirmed_at,
    'user',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public.users
  set
    email = new.email,
    email_verified = new.email_confirmed_at,
    name = coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', public.users.name),
    image = coalesce(new.raw_user_meta_data->>'avatar_url', public.users.image),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_update();

-- One-time backfill so existing accounts get real identity immediately,
-- rather than waiting on their next profile edit.
update public.users u
set
  name = coalesce(a.raw_user_meta_data->>'display_name', a.raw_user_meta_data->>'username', u.name),
  image = coalesce(a.raw_user_meta_data->>'avatar_url', u.image)
from auth.users a
where a.id = u.id;
