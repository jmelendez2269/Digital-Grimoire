import { chromium } from 'playwright-core';

async function testFetch() {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    console.log('Browser launched. Creating page...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    console.log('Navigating to sacred-texts.com...');
    const response = await page.goto('https://www.sacred-texts.com/eso/ihas/index.htm', {
      waitUntil: 'domcontentloaded',
    });
    
    console.log('Response status:', response?.status());
    const title = await page.title();
    console.log('Page title:', title);
    
    await browser.close();
  } catch (err) {
    console.error('Playwright test failed:', err);
  }
}

testFetch();
