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
  await new Promise(r => setTimeout(r, 1500));
  
  // Получаем количество страниц
  const totalPages = await page.evaluate(() => {
    const pageLinks = document.querySelectorAll('#searchResults_links .market_paging_pagelink');
    if (pageLinks.length === 0) return 1;
    
    // Берем последний номер страницы
    const lastPageLink = pageLinks[pageLinks.length - 1];
    return parseInt(lastPageLink.textContent.trim());
  });
  
  console.log(`📄 Всего страниц: ${totalPages}\n`);
  
  const buyOrderPrice = await page.evaluate(() => {
    const buyOrderEl = document.querySelector('#market_commodity_buyrequests .market_commodity_orders_header_promote:last-child');
    return buyOrderEl ? buyOrderEl.textContent.trim() : null;
  });
  
  console.log(`💰 Цена buy order: ${buyOrderPrice}\n`);
  
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
        price: null,
        stickers: [],
        pattern: null,
        float: null
      };
      
      const priceElement = listing.querySelector('.market_listing_price.market_listing_price_with_fee');
      if (priceElement) {
        data.price = priceElement.textContent.trim();
      }
      
      const stickerInfoInListing = listing.querySelector('#sticker_info');
      if (stickerInfoInListing) {
        data.stickerCount = stickerInfoInListing.querySelectorAll('img').length;
      }
      
      nameElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      
      const rect = nameElement.getBoundingClientRect();
      
      nameElement.dispatchEvent(new MouseEvent('mouseover', { 
        bubbles: true, 
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      }));
      
      let attempts = 0;
      let foundData = false;
      
      while (attempts < 40 && !foundData) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        const allBlocks = document.querySelectorAll('._3JCkAyd9cnB90tRcDLPp4W');
        
        for (let block of allBlocks) {
          const text = block.innerText || block.textContent;
          
          if (text.includes('Wear Rating') || text.includes('Pattern Template')) {
            
            const floatMatch = text.match(/Wear Rating[:\s]*([\d,\.]+)/i);
            if (floatMatch) {
              data.float = parseFloat(floatMatch[1].replace(',', '.'));
            }
            
            const patternMatch = text.match(/Pattern Template[:\s]*(\d+)/i);
            if (patternMatch) {
              data.pattern = parseInt(patternMatch[1]);
            }
            
            foundData = true;
            break;
          }
        }
        
        if (foundData) break;
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
              if (line.trim().startsWith('Sticker:')) {
                const stickerText = line.replace(/^Sticker:\s*/i, '').trim();
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
    }
    
    return results;
  });
  
  const output = {
    totalPages: totalPages,
    buyOrderPrice: buyOrderPrice,
    items: results
  };
  
  console.log('\n✅ Результаты:');
  console.table(results);
  
  fs.writeFileSync('results.json', JSON.stringify(output, null, 2));
  
  await browser.close();
})();
