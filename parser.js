const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // для отладки, потом можно true
    args: ['--no-sandbox']
  });
  
  const page = await puppeteer.newPage();
  
  // Переходим на страницу
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2'
  });
  
  // Ждем загрузки листингов
  await page.waitForSelector('.market_listing_row.market_recent_listing_row');
  
  // Инжектим и запускаем твой скрипт
  const results = await page.evaluate(async () => {
    const listings = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
    const results = [];
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const nameElement = listing.querySelector('.market_listing_item_name');
      
      const data = {
        index: i + 1,
        listingId: listing.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        stickers: [],
        pattern: null,
        float: null
      };
      
      // Наклейки в листинге
      const stickerInfoInListing = listing.querySelector('#sticker_info');
      if (stickerInfoInListing) {
        const imgs = stickerInfoInListing.querySelectorAll('img');
        data.stickerCount = imgs.length;
      }
      
      // Наводим мышку
      nameElement.dispatchEvent(new MouseEvent('mouseover', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Float и Pattern
      const allBlocks = document.querySelectorAll('._3JCkAyd9cnB90tRcDLPp4W');
      
      for (let block of allBlocks) {
        const text = block.innerText || block.textContent;
        
        if (text.includes('Степень износа') || text.includes('Шаблон раскраски')) {
          const floatMatch = text.match(/Степень износа[:\s]*([\d,\.]+)/i);
          if (floatMatch) {
            data.float = parseFloat(floatMatch[1].replace(',', '.'));
          }
          
          const patternMatch = text.match(/Шаблон раскраски[:\s]*(\d+)/i);
          if (patternMatch) {
            data.pattern = parseInt(patternMatch[1]);
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
                data.stickers = stickerNames;
                break;
              }
            }
          }
          break;
        }
      }
      
      // Убираем наведение
      nameElement.dispatchEvent(new MouseEvent('mouseout', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      }));
      
      results.push(data);
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return results;
  });
  
  console.log('✅ Результаты парсинга:');
  console.table(results);
  console.log(JSON.stringify(results, null, 2));
  
  await browser.close();
})();
