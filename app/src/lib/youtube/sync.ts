import { createServiceClient } from '@/lib/supabase/service';
import { resolveUploadsPlaylistId, fetchPlaylistVideoIds, fetchVideoDetails } from './client';

export interface SyncResult {
  created: number;
  updated: number;
}

export async function syncChannelVideos(): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    throw new Error('YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID must be configured');
  }

  const uploadsPlaylistId = await resolveUploadsPlaylistId(apiKey, channelId);
  const videoIds = await fetchPlaylistVideoIds(apiKey, uploadsPlaylistId);
  const details = await fetchVideoDetails(apiKey, videoIds);

  const supabase = createServiceClient();

  const { data: existingRows, error: existingError } = await supabase
    .from('videos')
    .select('youtube_video_id')
    .in('youtube_video_id', videoIds.length > 0 ? videoIds : ['__none__']);

  if (existingError) throw existingError;

  const existingIds = new Set((existingRows ?? []).map((row) => row.youtube_video_id));

  const toCreate = details.filter((video) => !existingIds.has(video.youtube_video_id));
  const toUpdate = details.filter((video) => existingIds.has(video.youtube_video_id));

  if (toCreate.length > 0) {
    const { error: insertError } = await supabase.from('videos').insert(
      toCreate.map((video) => ({
        youtube_video_id: video.youtube_video_id,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnail_url,
        tags: video.tags,
        published_at: video.published_at,
        synced_at: new Date().toISOString(),
      }))
    );
    if (insertError) throw insertError;
  }

  // Metadata-only update; deliberately does not touch tags/is_published so
  // admin curation survives re-syncs.
  await Promise.all(
    toUpdate.map((video) =>
      supabase
        .from('videos')
        .update({
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url,
          published_at: video.published_at,
          synced_at: new Date().toISOString(),
        })
        .eq('youtube_video_id', video.youtube_video_id)
    )
  );

  return { created: toCreate.length, updated: toUpdate.length };
}
