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
  
  // Получаем все листинги
  const listings = await page.$$('.market_listing_row.market_recent_listing_row');
  const results = [];
  
  for (let i = 0; i < listings.length; i++) {
    console.log(`[${i + 1}/${listings.length}] Обрабатываю...`);
    
    const listing = listings[i];
    
    // Получаем базовую информацию
    const data = await listing.evaluate((el, idx) => {
      const nameElement = el.querySelector('.market_listing_item_name');
      return {
        index: idx + 1,
        listingId: el.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        stickers: [],
        pattern: null,
        float: null
      };
    }, i);
    
    // НАВОДИМ МЫШКУ через page.hover() - правильный способ для Puppeteer
    const nameSelector = `#listing_${data.listingId} .market_listing_item_name`;
    
    try {
      await page.hover(nameSelector);
      
      // Ждем появления popup с данными
      await page.waitForTimeout(1000);
      
      // Парсим float, pattern и наклейки
      const parsed = await page.evaluate(() => {
        const result = {
          float: null,
          pattern: null,
          stickers: []
        };
        
        // 1. FLOAT И PATTERN
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
        
        // 2. НАКЛЕЙКИ
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
      
      // Объединяем данные
      data.float = parsed.float;
      data.pattern = parsed.pattern;
      data.stickers = parsed.stickers;
      
      // Убираем наведение (двигаем мышку в сторону)
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      
    } catch (error) {
      console.log(`Ошибка при парсинге листинга ${i + 1}: ${error.message}`);
    }
    
    results.push(data);
  }
  
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
