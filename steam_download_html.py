from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from datetime import datetime
import time

def download_steam_html():
    url = "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Legion%20of%20Anubis%20%28Field-Tested%29"
    
    print(f"[{datetime.now()}] Запуск браузера...")
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    driver = None
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        
        print(f"Открываем {url}")
        driver.get(url)
        
        print("Ждём загрузки скинов...")
        wait = WebDriverWait(driver, 30)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "market_listing_row")))
        time.sleep(5)  # Даём время всё загрузить
        
        print("✅ Страница загружена")
        
        # Получаем ВЕСЬ HTML после загрузки JavaScript
        html_content = driver.page_source
        
        # Сохраняем в файл
        filename = 'steam_page.html'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✅ HTML сохранён в файл: {filename}")
        print(f"Размер файла: {len(html_content)} символов")
        print(f"Размер: {len(html_content) / 1024:.2f} KB")
        
        # Проверяем что скины есть
        listings = driver.find_elements(By.CSS_SELECTOR, ".market_listing_row.market_recent_listing_row")
        print(f"Найдено скинов на странице: {len(listings)}")
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            driver.quit()
            print("Браузер закрыт")

if __name__ == "__main__":
    download_steam_html()
