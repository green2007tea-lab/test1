const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row', { timeout: 30000 });
  
  // Получаем список всех листингов
  const listings = await page.$$('.market_listing_row.market_recent_listing_row');
  const results = [];
  
  console.log(`Найдено скинов: ${listings.length}`);
  
  for (let i = 0; i < listings.length; i++) {
    console.log(`[${i + 1}/${listings.length}] Обрабатываю...`);
    
    const listing = listings[i];
    
    // Получаем базовую инфу
    const baseData = await listing.evaluate((el, idx) => {
      const nameElement = el.querySelector('.market_listing_item_name');
      const stickerInfoInListing = el.querySelector('#sticker_info');
      
      return {
        index: idx + 1,
        listingId: el.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        stickerCount: stickerInfoInListing ? stickerInfoInListing.querySelectorAll('img').length : 0
      };
    }, i);
    
    const data = {
      ...baseData,
      stickers: [],
      pattern: null,
      float: null
    };
    
    // КЛЮЧЕВОЙ МОМЕНТ: используем page.hover() - это НАСТОЯЩЕЕ наведение курсора
    try {
      const nameSelector = `#${baseData.listingId} .market_listing_item_name`;
      
      // Прокручиваем к элементу
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, nameSelector);
      
      await page.waitForTimeout(300);
      
      // РЕАЛЬНОЕ наведение курсора через Puppeteer
      await page.hover(nameSelector);
      
      // Ждем появления popup
      await page.waitForTimeout(2000);
      
      // Парсим float, pattern и наклейки
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
        
        // Наклейки из popup
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
      
      data.float = hoverData.float;
      data.pattern = hoverData.pattern;
      data.stickers = hoverData.stickers;
      
      // Убираем hover - наводимся на body
      await page.hover('body');
      await page.waitForTimeout(300);
      
    } catch (err) {
      console.log(`Ошибка при обработке скина ${i + 1}:`, err.message);
    }
    
    results.push(data);
  }
  
  console.log('\n✅ Результаты:');
  console.table(results);
  
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
