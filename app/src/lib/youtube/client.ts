const API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YoutubeVideoDetails {
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[];
  published_at: string | null;
}

async function youtubeGet<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API error (${response.status}) on ${path}: ${body}`);
  }
  return response.json();
}

export async function resolveUploadsPlaylistId(apiKey: string, channelId: string): Promise<string> {
  const data = await youtubeGet<{
    items: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  }>('channels', { part: 'contentDetails', id: channelId }, apiKey);

  const uploadsId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) {
    throw new Error(`Could not resolve uploads playlist for channel ${channelId}`);
  }
  return uploadsId;
}

export async function fetchPlaylistVideoIds(apiKey: string, playlistId: string): Promise<string[]> {
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: 'contentDetails',
      playlistId,
      maxResults: '50',
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await youtubeGet<{
      items: { contentDetails: { videoId: string } }[];
      nextPageToken?: string;
    }>('playlistItems', params, apiKey);

    for (const item of data.items ?? []) {
      if (item.contentDetails?.videoId) videoIds.push(item.contentDetails.videoId);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return videoIds;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function fetchVideoDetails(apiKey: string, videoIds: string[]): Promise<YoutubeVideoDetails[]> {
  const results: YoutubeVideoDetails[] = [];

  for (const batch of chunk(videoIds, 50)) {
    const data = await youtubeGet<{
      items: {
        id: string;
        snippet: {
          title: string;
          description?: string;
          publishedAt?: string;
          tags?: string[];
          thumbnails?: { medium?: { url: string }; default?: { url: string } };
        };
      }[];
    }>('videos', { part: 'snippet', id: batch.join(',') }, apiKey);

    for (const item of data.items ?? []) {
      results.push({
        youtube_video_id: item.id,
        title: item.snippet.title,
        description: item.snippet.description ?? null,
        thumbnail_url: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
        tags: item.snippet.tags ?? [],
        published_at: item.snippet.publishedAt ?? null,
      });
    }
  }

  return results;
}
