const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row');
  await new Promise(r => setTimeout(r, 3000));
  
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
      
      const stickerInfoInListing = listing.querySelector('#sticker_info');
      if (stickerInfoInListing) {
        data.stickerCount = stickerInfoInListing.querySelectorAll('img').length;
      }
      
      nameElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const rect = nameElement.getBoundingClientRect();
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
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const allBlocks = document.querySelectorAll('._3JCkAyd9cnB90tRcDLPp4W');
      
      for (let block of allBlocks) {
        const text = block.innerText || block.textContent;
        
        // ПОДДЕРЖКА АНГЛИЙСКОГО И РУССКОГО
        if (text.includes('Степень износа') || text.includes('Шаблон раскраски') || 
            text.includes('Wear Rating') || text.includes('Pattern Template')) {
          
          // Float (русский и английский)
          const floatMatch = text.match(/(?:Степень износа|Wear Rating)[:\s]*([\d,\.]+)/i);
          if (floatMatch) {
            data.float = parseFloat(floatMatch[1].replace(',', '.'));
          }
          
          // Pattern (русский и английский)
          const patternMatch = text.match(/(?:Шаблон раскраски|Pattern Template)[:\s]*(\d+)/i);
          if (patternMatch) {
            data.pattern = parseInt(patternMatch[1]);
          }
          
          break;
        }
      }
      
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
              // Поддержка русского и английского
              if (line.trim().startsWith('Наклейка:') || line.trim().startsWith('Sticker:')) {
                const stickerText = line.replace(/^(?:Наклейка|Sticker):\s*/i, '').trim();
                const stickerNames = stickerText.split(',').map(s => s.trim()).filter(s => s);
                data.stickers = stickerNames;
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
