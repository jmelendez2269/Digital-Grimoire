import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';

export interface ResolvedAuthor {
  name: string;
  avatar_url: string | null;
}

function fallbackName(userId: string) {
  return `Member ${userId.slice(0, 8)}`;
}

/**
 * Batch-resolve display name/avatar for a set of user ids via the
 * service-role client. public.users RLS only allows a user to read their
 * own row, so any surface that displays other users' identity (chat,
 * forum) must resolve it server-side like this rather than via a
 * client-exposed policy or view.
 */
export async function resolveAuthors(userIds: string[]): Promise<Map<string, ResolvedAuthor>> {
  const uniqueIds = Array.from(new Set(userIds));
  const result = new Map<string, ResolvedAuthor>();
  if (uniqueIds.length === 0) return result;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, image')
    .in('id', uniqueIds);

  if (error) {
    console.error('Failed to resolve authors:', error);
  }

  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));

  for (const id of uniqueIds) {
    const row = byId.get(id);
    result.set(id, {
      name: row?.name?.trim() || fallbackName(id),
      avatar_url: row?.image ?? null,
    });
  }

  return result;
}
