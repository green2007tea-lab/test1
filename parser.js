const puppeteer = require('puppeteer');
const fs = require('fs');

const STEAM_URL = 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29';

async function parseSteamMarket() {
  console.log('Запуск браузера...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Переход на страницу Steam Market...');
  await page.goto(STEAM_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  
  await page.waitForSelector('.market_listing_row.market_recent_listing_row', { timeout: 30000 });
  
  console.log('Парсинг скинов...');
  
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
      
      // НАВОДИМ МЫШКУ
      nameElement.dispatchEvent(new MouseEvent('mouseover', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      }));
      
      // УВЕЛИЧЕНА ЗАДЕРЖКА для загрузки popup (было 100ms, стало 800ms)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // ПАРСИМ FLOAT И PATTERN
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
      
      // ПАРСИМ НАКЛЕЙКИ
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
      
      // УБИРАЕМ НАВЕДЕНИЕ
      nameElement.dispatchEvent(new MouseEvent('mouseout', { 
        bubbles: true, 
        cancelable: true,
        view: window 
      }));
      
      results.push(data);
      
      // УВЕЛИЧЕНА ЗАДЕРЖКА между скинами (было 10ms, стало 200ms)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  });
  
  console.log(`Обработано скинов: ${results.length}`);
  
  const output = {
    timestamp: new Date().toISOString(),
    url: STEAM_URL,
    total: results.length,
    data: results
  };
  
  fs.writeFileSync('results.json', JSON.stringify(output, null, 2));
  console.log('Результаты сохранены в results.json');
  
  await browser.close();
  
  return results;
}

parseSteamMarket()
  .then(results => {
    console.log('✅ Парсинг завершен успешно!');
    console.table(results);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
