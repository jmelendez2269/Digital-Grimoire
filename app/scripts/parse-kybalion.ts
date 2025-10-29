import * as fs from 'fs';
import * as path from 'path';

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface KybalionData {
  chapters: Chapter[];
}

/**
 * Parse The Kybalion text file into structured chapters
 */
export function parseKybalion(filePath: string): KybalionData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentContent: string[] = [];
  let inChapter = false;
  
  // Find introduction
  let introStart = -1;
  let introEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect introduction section
    if (line === 'INTRODUCTION' && introStart === -1) {
      introStart = i;
      inChapter = true;
      currentChapter = {
        id: 'introduction',
        title: 'Introduction',
        content: ''
      };
      currentContent = [];
      continue;
    }
    
    // Detect chapter start (e.g., "CHAPTER I", "CHAPTER II", etc.)
    if (line.match(/^CHAPTER [IVX]+$/)) {
      // Save previous chapter
      if (currentChapter && currentContent.length > 0) {
        currentChapter.content = cleanContent(currentContent.join('\n'));
        chapters.push(currentChapter);
      }
      
      // Start new chapter
      const chapterNumber = line.replace('CHAPTER ', '');
      const titleLine = lines[i + 2]?.trim() || ''; // Title is 2 lines after CHAPTER
      
      currentChapter = {
        id: `chapter-${romanToNumber(chapterNumber)}`,
        title: `Chapter ${chapterNumber}: ${titleLine}`,
        content: ''
      };
      currentContent = [];
      inChapter = true;
      i += 2; // Skip the blank line and title line
      continue;
    }
    
    // Collect content if we're in a chapter
    if (inChapter && currentChapter) {
      // Skip separator lines
      if (line.includes('The Kybalion, by Three Initiates') || 
          line.includes('sacred-texts.com') ||
          line.match(/^\s*$/)) {
        continue;
      }
      
      // Add content line
      if (line.length > 0) {
        currentContent.push(line);
      } else if (currentContent.length > 0 && currentContent[currentContent.length - 1] !== '') {
        // Add paragraph break
        currentContent.push('');
      }
    }
  }
  
  // Save last chapter
  if (currentChapter && currentContent.length > 0) {
    currentChapter.content = cleanContent(currentContent.join('\n'));
    chapters.push(currentChapter);
  }
  
  return { chapters };
}

/**
 * Clean and format content
 */
function cleanContent(content: string): string {
  // Convert Kybalion maxims (quoted text) to markdown italics
  let cleaned = content.replace(/"([^"]+)"--The Kybalion\./g, '_"$1"_ —The Kybalion');
  cleaned = cleaned.replace(/"([^"]+)"--The\s+Kybalion\./g, '_"$1"_ —The Kybalion');
  
  // Remove excessive blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Format numbered lists
  cleaned = cleaned.replace(/^(\d+)\.\s+/gm, '$1. ');
  
  // Clean up spacing
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Convert Roman numerals to numbers
 */
function romanToNumber(roman: string): number {
  const romanMap: { [key: string]: number } = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15
  };
  return romanMap[roman] || 0;
}

// Run parser if executed directly
if (require.main === module) {
  const inputPath = process.argv[2] || path.join(__dirname, '../../kyb.txt');
  const outputPath = process.argv[3] || path.join(__dirname, '../kybalion-parsed.json');
  
  console.log('Parsing Kybalion from:', inputPath);
  
  try {
    const data = parseKybalion(inputPath);
    
    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`✓ Successfully parsed ${data.chapters.length} chapters`);
    console.log('✓ Output written to:', outputPath);
    
    // Print summary
    console.log('\nChapters found:');
    data.chapters.forEach((chapter, index) => {
      console.log(`  ${index + 1}. ${chapter.title} (${chapter.content.length} chars)`);
    });
  } catch (error) {
    console.error('Error parsing Kybalion:', error);
    process.exit(1);
  }
}

