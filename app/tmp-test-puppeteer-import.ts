import { parseSacredText } from './src/lib/parsers/sacred-texts-parser';

async function test() {
  try {
    console.log('Testing parseSacredText on sacred-texts.com/eso/ihas/index.htm...');
    const result = await parseSacredText('https://www.sacred-texts.com/eso/ihas/index.htm', 'markdown');
    
    console.log('--- Metadata ---');
    console.log(result.metadata);
    console.log(`--- Chapters Found: ${result.chapterCount} ---`);
    console.log(`--- Total Length: ${result.totalLength} chars ---`);
    console.log('--- First Chapter Preview ---');
    if (result.chapters.length > 0) {
      console.log(result.chapters[0].title);
      console.log(result.chapters[0].content.substring(0, 300) + '...');
    }
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

test();
