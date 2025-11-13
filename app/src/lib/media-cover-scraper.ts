// Album art scraping service for audio files
// Tries multiple APIs in cascade: MusicBrainz → Last.fm → Spotify

export interface AlbumArtResult {
  success: boolean;
  imageUrl?: string;
  source?: 'musicbrainz' | 'lastfm' | 'spotify';
  error?: string;
}

/**
 * Try MusicBrainz API first (comprehensive music database)
 */
async function tryMusicBrainz(title: string, artist?: string): Promise<AlbumArtResult> {
  try {
    console.log(`[MusicBrainz] Searching for: ${title}${artist ? ` by ${artist}` : ''}`);
    
    // Search for recordings
    const searchQuery = encodeURIComponent(artist ? `${title} AND artist:${artist}` : title);
    const searchUrl = `https://musicbrainz.org/ws/2/recording?query=${searchQuery}&limit=1&fmt=json`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'DigitalGrimoire/1.0 (https://digitalgrimoire.com)',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.recordings && data.recordings.length > 0) {
      const recording = data.recordings[0];
      // MusicBrainz doesn't directly provide cover art, but we can use it to get release info
      // For now, we'll skip to other sources
      console.log(`[MusicBrainz] Found recording but no direct cover art API`);
      return { success: false, error: 'No direct cover art API' };
    }
    
    console.log(`[MusicBrainz] ✗ No recording found`);
    return { success: false, error: 'No recording found' };
  } catch (error) {
    console.log(`[MusicBrainz] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Try Last.fm API (good for album art)
 */
async function tryLastFm(title: string, artist?: string): Promise<AlbumArtResult> {
  try {
    console.log(`[Last.fm] Searching for: ${title}${artist ? ` by ${artist}` : ''}`);
    
    // Last.fm requires API key, but we can try without it for basic search
    // For production, add LASTFM_API_KEY to env
    const apiKey = process.env.LASTFM_API_KEY || '';
    
    if (!apiKey) {
      console.log(`[Last.fm] ✗ API key not configured`);
      return { success: false, error: 'API key not configured' };
    }
    
    const method = artist ? 'track.getInfo' : 'track.search';
    const params = new URLSearchParams({
      method,
      api_key: apiKey,
      format: 'json',
      ...(artist ? { artist, track: title } : { track: title }),
    });
    
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      headers: { 'User-Agent': 'DigitalGrimoire/1.0' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract album art from response
    let imageUrl: string | undefined;
    
    if (method === 'track.getInfo' && data.track?.album?.image) {
      // Get largest image
      const images = data.track.album.image;
      imageUrl = images[images.length - 1]?.['#text'];
    } else if (data.results?.trackmatches?.track) {
      const track = Array.isArray(data.results.trackmatches.track)
        ? data.results.trackmatches.track[0]
        : data.results.trackmatches.track;
      if (track.image) {
        const images = track.image;
        imageUrl = images[images.length - 1]?.['#text'];
      }
    }
    
    if (imageUrl && imageUrl !== '') {
      console.log(`[Last.fm] ✓ Found cover: ${imageUrl}`);
      return {
        success: true,
        imageUrl,
        source: 'lastfm',
      };
    }
    
    console.log(`[Last.fm] ✗ No cover found`);
    return { success: false, error: 'No cover found' };
  } catch (error) {
    console.log(`[Last.fm] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Try Spotify API (requires authentication)
 */
async function trySpotify(title: string, artist?: string): Promise<AlbumArtResult> {
  try {
    console.log(`[Spotify] Searching for: ${title}${artist ? ` by ${artist}` : ''}`);
    
    // Spotify requires OAuth, which is complex for server-side
    // For now, we'll skip this and use it as a future enhancement
    // In production, implement Spotify OAuth flow
    console.log(`[Spotify] ✗ Not implemented (requires OAuth)`);
    return { success: false, error: 'Not implemented' };
  } catch (error) {
    console.log(`[Spotify] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Main scraping cascade for album art
 * Tries sources in priority order: Last.fm → MusicBrainz → Spotify
 */
export async function scrapeAlbumArt(
  title: string,
  artist?: string
): Promise<AlbumArtResult> {
  console.log(`\n🔍 Starting album art scrape cascade for: "${title}"${artist ? ` by ${artist}` : ''}`);
  
  // Try Last.fm first (best for album art if API key is configured)
  const lastFmResult = await tryLastFm(title, artist);
  if (lastFmResult.success) {
    console.log(`✓ Album art found via Last.fm\n`);
    return lastFmResult;
  }
  
  // Try MusicBrainz (comprehensive but no direct cover art)
  const musicBrainzResult = await tryMusicBrainz(title, artist);
  if (musicBrainzResult.success) {
    console.log(`✓ Album art found via MusicBrainz\n`);
    return musicBrainzResult;
  }
  
  // Finally try Spotify (requires OAuth)
  const spotifyResult = await trySpotify(title, artist);
  if (spotifyResult.success) {
    console.log(`✓ Album art found via Spotify\n`);
    return spotifyResult;
  }
  
  console.log(`✗ No album art found from any source\n`);
  return {
    success: false,
    error: 'No album art found from any source (Last.fm, MusicBrainz, or Spotify)',
  };
}

