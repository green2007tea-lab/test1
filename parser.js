const puppeteer = require('puppeteer');
const fs = require('fs');

const STEAM_URL = 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Rat%20Rod%20%28Factory%20New%29';

// Функция для получения float/pattern из inspect ссылки
function parseInspectLink(inspectUrl) {
  // Формат: steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M{listingId}A{assetId}D{data}
  const match = inspectUrl.match(/M(\d+)A(\d+)D(\d+)/);
  
  if (!match) return { float: null, pattern: null };
  
  const [, listingId, assetId, dataValue] = match;
  
  // D параметр содержит закодированные данные
  // Это приближенное декодирование, может быть неточным
  const data = BigInt(dataValue);
  
  // Извлекаем pattern (младшие 16 бит)
  const pattern = Number(data & BigInt(0xFFFF));
  
  // Извлекаем float (следующие 32 бита, нужна формула)
  // Упрощенная формула (может быть неточной)
  const floatBits = Number((data >> BigInt(16)) & BigInt(0xFFFFFFFF));
  const float = floatBits / 0xFFFFFFFF;
  
  return { pattern, float };
}

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
  
  // Парсим все данные сразу
  const results = await page.evaluate(() => {
    const listings = document.querySelectorAll('.market_listing_row.market_recent_listing_row');
    const results = [];
    
    listings.forEach((listing, i) => {
      const nameElement = listing.querySelector('.market_listing_item_name');
      const inspectLink = listing.querySelector('.market_listing_row_action a');
      
      // Наклейки из sticker_info (если есть)
      const stickerInfo = listing.querySelector('#sticker_info');
      const stickers = [];
      
      if (stickerInfo) {
        const stickerText = stickerInfo.innerText || stickerInfo.textContent;
        // Ищем строку с названиями (обычно внизу блока)
        const lines = stickerText.split('\n');
        for (let line of lines) {
          if (line.includes(',') || line.length > 20) {
            const names = line.split(',').map(s => s.trim()).filter(s => s && s.length > 3);
            if (names.length > 0) {
              stickers.push(...names);
            }
          }
        }
      }
      
      results.push({
        index: i + 1,
        listingId: listing.id.replace('listing_', ''),
        name: nameElement ? nameElement.textContent.trim() : null,
        inspectUrl: inspectLink ? inspectLink.href : null,
        stickers: stickers,
        pattern: null,
        float: null
      });
    });
    
    return results;
  });
  
  // Обрабатываем inspect ссылки для получения float/pattern
  results.forEach(item => {
    if (item.inspectUrl) {
      const parsed = parseInspectLink(item.inspectUrl);
      item.pattern = parsed.pattern;
      item.float = parsed.float > 0 && parsed.float < 1 ? parsed.float : null;
    }
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
