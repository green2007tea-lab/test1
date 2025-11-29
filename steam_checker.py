from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from datetime import datetime
import time
import re

def parse_steam_with_selenium():
    url = "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Legion%20of%20Anubis%20%28Field-Tested%29"
    
    print(f"[{datetime.now()}] Запуск браузера...")
    
    # Настройки Chrome
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Без GUI
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    driver = None
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        
        print(f"[{datetime.now()}] Открываем страницу Steam...")
        driver.get(url)
        
        # Ждём загрузки скинов (максимум 30 секунд)
        print(f"[{datetime.now()}] Ждём загрузки скинов...")
        wait = WebDriverWait(driver, 30)
        
        # Ждём пока появятся скины
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "market_listing_row")))
        
        # Даём ещё 3 секунды на подгрузку всего
        time.sleep(3)
        
        print("✅ Страница загружена, парсим данные...\n")
        
        # Находим все скины
        listings = driver.find_elements(By.CSS_SELECTOR, ".market_listing_row.market_recent_listing_row")
        
        if not listings:
            print("❌ Скины не найдены")
            return
        
        print(f"Найдено скинов: {len(listings)}\n")
        print("="*80)
        
        for idx, listing in enumerate(listings[:20], 1):  # Берём первые 20
            print(f"\n🔫 СКИН #{idx}")
            print("-"*80)
            
            try:
                # 1. Название
                try:
                    name_elem = listing.find_element(By.CLASS_NAME, "market_listing_item_name")
                    skin_name = name_elem.text.strip()
                    print(f"Название: {skin_name}")
                except:
                    print("Название: Не найдено")
                
                # 2. Цена
                try:
                    price_elem = listing.find_element(By.CSS_SELECTOR, ".market_listing_price.market_listing_price_with_fee")
                    price = price_elem.text.strip()
                    print(f"Цена: {price}")
                except:
                    print("Цена: Не найдено")
                
                # 3. Наклейки - наводим мышку для появления tooltip
                try:
                    # Пробуем найти sticker_info напрямую
                    sticker_div = listing.find_element(By.ID, "sticker_info")
                    
                    # Получаем HTML контент
                    sticker_html = sticker_div.get_attribute('innerHTML')
                    
                    # Ищем все title атрибуты с наклейками
                    sticker_titles = re.findall(r'title="([^"]*Наклейка[^"]*)"', sticker_html)
                    
                    if sticker_titles:
                        print(f"Наклейки ({len(sticker_titles)} шт.):")
                        for i, sticker in enumerate(sticker_titles, 1):
                            # Убираем "Наклейка: " из начала
                            clean_name = sticker.replace('Наклейка: ', '')
                            print(f"  {i}. {clean_name}")
                    else:
                        # Пробуем по-другому - считаем картинки
                        sticker_imgs = sticker_div.find_elements(By.TAG_NAME, "img")
                        if sticker_imgs:
                            print(f"Наклейки ({len(sticker_imgs)} шт.):")
                            for i, img in enumerate(sticker_imgs, 1):
                                title = img.get_attribute('title')
                                if title:
                                    clean_name = title.replace('Наклейка: ', '')
                                    print(f"  {i}. {clean_name}")
                                else:
                                    print(f"  {i}. [Без названия]")
                        else:
                            print("Наклейки: Нет")
                
                except Exception as e:
                    print("Наклейки: Нет или ошибка")
                
                # 4. Потертость и шаблон
                try:
                    # Кликаем на скин чтобы увидеть детали
                    # Или ищем в DOM напрямую
                    details_text = listing.get_attribute('innerHTML')
                    
                    # Ищем потертость
                    wear_match = re.search(r'Степень износа:\s*<[^>]+>([\d,\.]+)', details_text)
                    if not wear_match:
                        wear_match = re.search(r'([\d,\.]+)', details_text)
                    
                    if wear_match:
                        wear = wear_match.group(1)
                        print(f"Потертость: {wear}")
                    
                    # Ищем шаблон
                    pattern_match = re.search(r'Шаблон раскраски:\s*<[^>]+>(\d+)', details_text)
                    if pattern_match:
                        pattern = pattern_match.group(1)
                        print(f"Шаблон: {pattern}")
                
                except:
                    pass
                
            except Exception as e:
                print(f"⚠️ Ошибка обработки скина: {e}")
            
            print("="*80)
        
        print(f"\n✅ Парсинг завершён. Обработано скинов: {min(len(listings), 20)}")
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            driver.quit()
            print("\n[Браузер закрыт]")

if __name__ == "__main__":
    parse_steam_with_selenium()
