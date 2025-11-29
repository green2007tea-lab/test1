const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row');
  
  // Извлекаем inspect links из всех листингов
  const inspectData = await page.evaluate(() => {
    const listings = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
    const results = [];
    
    listings.forEach((listing, i) => {
      const nameElement = listing.querySelector('.market_listing_item_name');
      const inspectButton = listing.querySelector('a[href^="steam://rungame"]');
      
      const data = {
        index: i + 1,
        listingId: listing.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        inspectLink: inspectButton ? inspectButton.href : null
      };
      
      // Наклейки (count)
      const stickerInfo = listing.querySelector('#sticker_info');
      if (stickerInfo) {
        data.stickerCount = stickerInfo.querySelectorAll('img').length;
      }
      
      results.push(data);
    });
    
    return results;
  });
  
  console.log('Найдено листингов:', inspectData.length);
  
  // Получаем float/pattern через API для каждого inspect link
  const results = [];
  
  for (const item of inspectData) {
    console.log(`[${item.index}] Получаю float для ${item.name}...`);
    
    if (!item.inspectLink) {
      results.push({ ...item, float: null, pattern: null, stickers: [] });
      continue;
    }
    
    try {
      // Используем публичный CSFloat API (может быть rate limit)
      const apiUrl = `https://api.csfloat.com/?url=${encodeURIComponent(item.inspectLink)}`;
      
      const response = await page.evaluate(async (url) => {
        const res = await fetch(url);
        return await res.json();
      }, apiUrl);
      
      results.push({
        ...item,
        float: response.iteminfo?.floatvalue || null,
        pattern: response.iteminfo?.paintseed || null,
        stickers: response.iteminfo?.stickers?.map(s => s.name) || []
      });
      
      // Rate limit delay
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.log(`Ошибка для ${item.index}:`, err.message);
      results.push({ ...item, float: null, pattern: null, stickers: [] });
    }
  }
  
  console.log('\n✅ Результаты:');
  console.table(results);
  
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
