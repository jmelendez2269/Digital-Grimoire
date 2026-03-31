import puppeteer from 'puppeteer';

async function testFetch() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched. Creating page...');
    const page = await browser.newPage();
    
    // Set typical browser User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log('Navigating to sacred-texts.com...');
    const response = await page.goto('https://www.sacred-texts.com/eso/ihas/index.htm', {
      waitUntil: 'networkidle2', // Wait for network to be largely idle
    });
    
    console.log('Response status:', response?.status());
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if we hit a cloudflare challenge
    const content = await page.content();
    if (content.includes('Cloudflare') || content.includes('Just a moment')) {
      console.log('Cloudflare challenge detected.');
    } else {
      console.log('No visible Cloudflare challenge.');
      console.log('Content snippet:', content.substring(0, 200));
    }

  } catch (err) {
    console.error('Puppeteer test failed:', err);
  } finally {
    if (browser) await browser.close();
  }
}

testFetch();
