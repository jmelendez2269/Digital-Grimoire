// Multi-source book cover scraping service
// Tries multiple APIs in cascade: Open Library → Internet Archive → Google Books

export interface CoverResult {
  success: boolean;
  imageUrl?: string;
  source?: 'open-library' | 'internet-archive' | 'google-books';
  error?: string;
}

/**
 * Try Open Library API first (best for public domain books)
 */
async function tryOpenLibrary(title: string, author: string): Promise<CoverResult> {
  try {
    console.log(`[OpenLibrary] Searching for: ${title} by ${author}`);
    
    // Search by title/author
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://openlibrary.org/search.json?q=${searchQuery}&limit=1`;
    
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'DigitalGrimoire/1.0' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
      const coverId = data.docs[0].cover_i;
      const imageUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      
      console.log(`[OpenLibrary] ✓ Found cover: ${imageUrl}`);
      return {
        success: true,
        imageUrl,
        source: 'open-library',
      };
    }
    
    console.log(`[OpenLibrary] ✗ No cover found`);
    return { success: false, error: 'No cover found' };
  } catch (error) {
    console.log(`[OpenLibrary] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Try Internet Archive (excellent for old/esoteric texts)
 */
async function tryInternetArchive(title: string, author: string): Promise<CoverResult> {
  try {
    console.log(`[InternetArchive] Searching for: ${title} by ${author}`);
    
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://archive.org/advancedsearch.php?q=${searchQuery}&fl=identifier,title&output=json&rows=1`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.response?.docs && data.response.docs.length > 0) {
      const identifier = data.response.docs[0].identifier;
      const imageUrl = `https://archive.org/services/img/${identifier}`;
      
      console.log(`[InternetArchive] ✓ Found cover: ${imageUrl}`);
      return {
        success: true,
        imageUrl,
        source: 'internet-archive',
      };
    }
    
    console.log(`[InternetArchive] ✗ No cover found`);
    return { success: false, error: 'No cover found' };
  } catch (error) {
    console.log(`[InternetArchive] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Try Google Books API (modern fallback)
 */
async function tryGoogleBooks(title: string, author: string): Promise<CoverResult> {
  try {
    console.log(`[GoogleBooks] Searching for: ${title} by ${author}`);
    
    const searchQuery = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const thumbnail = data.items[0].volumeInfo?.imageLinks?.thumbnail;
      if (thumbnail) {
        // Upgrade to larger size and use HTTPS
        const largeUrl = thumbnail
          .replace('zoom=1', 'zoom=2')
          .replace('http://', 'https://');
        
        console.log(`[GoogleBooks] ✓ Found cover: ${largeUrl}`);
        return {
          success: true,
          imageUrl: largeUrl,
          source: 'google-books',
        };
      }
    }
    
    console.log(`[GoogleBooks] ✗ No cover found`);
    return { success: false, error: 'No cover found' };
  } catch (error) {
    console.log(`[GoogleBooks] ✗ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Main scraping cascade - tries sources in priority order
 * 1. Open Library (best for public domain)
 * 2. Internet Archive (good for old/esoteric texts)
 * 3. Google Books (modern fallback)
 */
export async function scrapeCover(title: string, author: string): Promise<CoverResult> {
  console.log(`\n🔍 Starting cover scrape cascade for: "${title}" by ${author}`);
  
  // Try Open Library first (best for public domain)
  const openLibraryResult = await tryOpenLibrary(title, author);
  if (openLibraryResult.success) {
    console.log(`✓ Cover found via Open Library\n`);
    return openLibraryResult;
  }
  
  // Fall back to Internet Archive (good for old/esoteric texts)
  const archiveResult = await tryInternetArchive(title, author);
  if (archiveResult.success) {
    console.log(`✓ Cover found via Internet Archive\n`);
    return archiveResult;
  }
  
  // Finally try Google Books
  const googleResult = await tryGoogleBooks(title, author);
  if (googleResult.success) {
    console.log(`✓ Cover found via Google Books\n`);
    return googleResult;
  }
  
  console.log(`✗ No cover found from any source\n`);
  return {
    success: false,
    error: 'No cover found from any source (Open Library, Internet Archive, or Google Books)',
  };
}

