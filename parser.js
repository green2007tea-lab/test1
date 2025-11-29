const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // ВАЖНО: false чтобы видеть что происходит
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row');
  await page.waitForTimeout(2000); // даём странице прогрузиться
  
  const results = [];
  
  // Получаем количество листингов
  const listingsCount = await page.$$eval('.market_listing_row.market_recent_listing_row', els => els.length);
  console.log(`Найдено скинов: ${listingsCount}`);
  
  for (let i = 0; i < listingsCount; i++) {
    console.log(`[${i + 1}/${listingsCount}] Обрабатываю...`);
    
    // Получаем базовую инфу
    const baseData = await page.evaluate((index) => {
      const listings = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
      const listing = listings[index];
      const nameElement = listing.querySelector('.market_listing_item_name');
      
      const data = {
        index: index + 1,
        listingId: listing.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null
      };
      
      const stickerInfoInListing = listing.querySelector('#sticker_info');
      if (stickerInfoInListing) {
        data.stickerCount = stickerInfoInListing.querySelectorAll('img').length;
      }
      
      return data;
    }, i);
    
    // РЕАЛЬНОЕ наведение мышки через Puppeteer
    const selector = `.market_listing_row.market_recent_listing_row:nth-child(${i + 1}) .market_listing_item_name`;
    
    try {
      // Прокручиваем к элементу
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, selector);
      
      await page.waitForTimeout(500);
      
      // НАСТОЯЩЕЕ наведение курсора
      await page.hover(selector);
      
      // Ждём popup
      await page.waitForTimeout(2000);
      
      // Парсим данные
      const hoverData = await page.evaluate(() => {
        const result = {
          float: null,
          pattern: null,
          stickers: []
        };
        
        // Float и Pattern
        const allBlocks = document.querySelectorAll('._3JCkAyd9cnB90tRcDLPp4W');
        for (let block of allBlocks) {
          const text = block.innerText || block.textContent;
          
          if (text.includes('Степень износа') || text.includes('Шаблон раскраски')) {
            const floatMatch = text.match(/Степень износа[:\s]*([\d,\.]+)/i);
            if (floatMatch) {
              result.float = parseFloat(floatMatch[1].replace(',', '.'));
            }
            
            const patternMatch = text.match(/Шаблон раскраски[:\s]*(\d+)/i);
            if (patternMatch) {
              result.pattern = parseInt(patternMatch[1]);
            }
            break;
          }
        }
        
        // Наклейки
        const allStickerInfos = document.querySelectorAll('#sticker_info');
        for (let stickerBlock of allStickerInfos) {
          const hasCenter = stickerBlock.querySelector('center');
          const hasBorder = stickerBlock.style.border || (stickerBlock.getAttribute('style') || '').includes('border');
          
          if (hasCenter || hasBorder) {
            const centerEl = stickerBlock.querySelector('center');
            if (centerEl) {
              const fullText = centerEl.innerText || centerEl.textContent;
              const lines = fullText.split('\n');
              
              for (let line of lines) {
                if (line.trim().startsWith('Наклейка:')) {
                  const stickerText = line.replace(/^Наклейка:\s*/i, '').trim();
                  const stickerNames = stickerText.split(',').map(s => s.trim()).filter(s => s);
                  result.stickers = stickerNames;
                  break;
                }
              }
            }
            break;
          }
        }
        
        return result;
      });
      
      results.push({
        ...baseData,
        ...hoverData
      });
      
      // Убираем hover
      await page.mouse.move(0, 0);
      await page.waitForTimeout(500);
      
    } catch (err) {
      console.log(`Ошибка для ${i + 1}:`, err.message);
      results.push({
        ...baseData,
        float: null,
        pattern: null,
        stickers: []
      });
    }
  }
  
  console.log('\n✅ Результаты:');
  console.table(results);
  
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
