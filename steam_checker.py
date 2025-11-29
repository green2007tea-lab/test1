import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

def parse_steam_market():
    url = "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Legion%20of%20Anubis%20%28Field-Tested%29"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
    }
    
    try:
        print(f"[{datetime.now()}] Запрос к Steam...")
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Ошибка: Status {response.status_code}")
            return
        
        print("✅ Страница получена, парсим данные...\n")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Находим все скины на странице
        listings = soup.find_all('div', class_='market_listing_row market_recent_listing_row')
        
        if not listings:
            print("❌ Скины не найдены на странице")
            print("Возможно, страница загружается через JavaScript")
            print("Нужно использовать Selenium для полной загрузки")
            return
        
        print(f"Найдено скинов: {len(listings)}\n")
        print("="*80)
        
        for idx, listing in enumerate(listings, 1):
            print(f"\n🔫 СКИН #{idx}")
            print("-"*80)
            
            # 1. Название скина
            name_elem = listing.find('span', class_='market_listing_item_name')
            skin_name = name_elem.get_text(strip=True) if name_elem else "Не найдено"
            print(f"Название: {skin_name}")
            
            # 2. Цена
            price_elem = listing.find('span', class_='market_listing_price market_listing_price_with_fee')
            price = price_elem.get_text(strip=True) if price_elem else "Не найдено"
            print(f"Цена: {price}")
            
            # 3. Наклейки
            sticker_div = listing.find('div', id='sticker_info')
            if sticker_div:
                sticker_imgs = sticker_div.find_all('img')
                if sticker_imgs:
                    print(f"Наклейки ({len(sticker_imgs)} шт.):")
                    for i, img in enumerate(sticker_imgs, 1):
                        sticker_name = img.get('title', 'Без названия')
                        # Убираем "Наклейка: " из начала
                        sticker_name = sticker_name.replace('Наклейка: ', '')
                        print(f"  {i}. {sticker_name}")
                else:
                    print("Наклейки: Нет")
            else:
                print("Наклейки: Нет")
            
            # 4. Потертость и шаблон
            details_div = listing.find('div', class_='market_listing_row_details')
            if details_div:
                details_text = details_div.get_text()
                
                # Ищем потертость
                wear_match = re.search(r'Степень износа:\s*([\d,\.]+)', details_text)
                if wear_match:
                    wear = wear_match.group(1)
                    print(f"Потертость: {wear}")
                
                # Ищем шаблон
                pattern_match = re.search(r'Шаблон раскраски:\s*(\d+)', details_text)
                if pattern_match:
                    pattern = pattern_match.group(1)
                    print(f"Шаблон: {pattern}")
            
            print("="*80)
        
        print(f"\n✅ Парсинг завершён. Обработано скинов: {len(listings)}")
        
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: Превышено время ожидания")
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parse_steam_market()
