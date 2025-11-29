const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Включаем логи из браузера
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row');
  await new Promise(r => setTimeout(r, 3000)); // Увеличил до 3 сек
  
  const results = await page.evaluate(async () => {
    const listings = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
    const results = [];
    
    console.log(`Найдено скинов: ${listings.length}`);
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const nameElement = listing.querySelector('.market_listing_item_name');
      
      console.log(`[${i + 1}] Обрабатываю ${nameElement?.textContent}`);
      
      const data = {
        index: i + 1,
        listingId: listing.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        stickers: [],
        pattern: null,
        float: null
      };
      
      const stickerInfoInListing = listing.querySelector('#sticker_info');
      if (stickerInfoInListing) {
        data.stickerCount = stickerInfoInListing.querySelectorAll('img').length;
      }
      
      nameElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Получаем координаты элемента
      const rect = nameElement.getBoundingClientRect();
      console.log(`Coordinates: ${rect.left}, ${rect.top}`);
      
      // Создаем ПОЛНЫЙ набор событий
      const events = ['mouseenter', 'mouseover', 'mousemove'];
      for (let eventType of events) {
        nameElement.dispatchEvent(new MouseEvent(eventType, { 
          bubbles: true, 
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        }));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2500)); // Увеличил до 2.5 сек
      
      // ДЕБАГ: проверяем что появилось
      const allBlocks = document.querySelectorAll('._3JCkAyd9cnB90tRcDLPp4W');
      console.log(`Найдено блоков с классом: ${allBlocks.length}`);
      
      for (let block of allBlocks) {
        const text = block.innerText || block.textContent;
        console.log(`Текст блока: ${text.substring(0, 100)}`);
        
        if (text.includes('Степень износа') || text.includes('Шаблон раскраски')) {
          console.log('НАШЕЛ float/pattern блок!');
          
          const floatMatch = text.match(/Степень износа[:\s]*([\d,\.]+)/i);
          if (floatMatch) {
            data.float = parseFloat(floatMatch[1].replace(',', '.'));
            console.log(`Float: ${data.float}`);
          }
          
          const patternMatch = text.match(/Шаблон раскраски[:\s]*(\d+)/i);
          if (patternMatch) {
            data.pattern = parseInt(patternMatch[1]);
            console.log(`Pattern: ${data.pattern}`);
          }
          
          break;
        }
      }
      
      const allStickerInfos = document.querySelectorAll('#sticker_info');
      console.log(`Найдено sticker_info блоков: ${allStickerInfos.length}`);
      
      for (let stickerBlock of allStickerInfos) {
        const hasCenter = stickerBlock.querySelector('center');
        const hasBorder = stickerBlock.style.border || (stickerBlock.getAttribute('style') || '').includes('border');
        
        if (hasCenter || hasBorder) {
          console.log('НАШЕЛ popup sticker блок!');
          const centerEl = stickerBlock.querySelector('center');
          if (centerEl) {
            const fullText = centerEl.innerText || centerEl.textContent;
            const lines = fullText.split('\n');
            
            for (let line of lines) {
              if (line.trim().startsWith('Наклейка:')) {
                const stickerText = line.replace(/^Наклейка:\s*/i, '').trim();
                const stickerNames = stickerText.split(',').map(s => s.trim()).filter(s => s);
                data.stickers = stickerNames;
                console.log(`Stickers: ${data.stickers.join(', ')}`);
                break;
              }
            }
          }
          break;
        }
      }
      
      nameElement.dispatchEvent(new MouseEvent('mouseout', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      }));
      
      results.push(data);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  });
  
  console.log('\n✅ Результаты:');
  console.table(results);
  
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  
  await browser.close();
})();
