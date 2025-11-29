import requests
import sys
from datetime import datetime

def check_steam_page():
    url = "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Legion%20of%20Anubis%20%28Field-Tested%29"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        print(f"[{datetime.now()}] Запрос к Steam...")
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content Length: {len(response.text)} символов")
        print(f"IP адрес runner: {requests.get('https://api.ipify.org').text}")
        print("-" * 50)
        
        if response.status_code == 200:
            print("✅ УСПЕХ: Получили страницу")
            # Проверяем что это реально страница, а не заглушка
            if "Legion of Anubis" in response.text:
                print("✅ Контент валидный - нашли название предмета")
            else:
                print("⚠️ Страница получена, но контент подозрительный")
            
            # Сохраняем первые 1000 символов для проверки
            print("\nПервые 500 символов ответа:")
            print(response.text[:500])
            
        elif response.status_code == 429:
            print("❌ ОШИБКА 429: Rate limit / Too Many Requests")
            print("Steam заблокировал IP")
            
        elif response.status_code == 403:
            print("❌ ОШИБКА 403: Forbidden")
            print("Steam заблокировал доступ")
            
        else:
            print(f"⚠️ Неожиданный статус: {response.status_code}")
            print(f"Ответ: {response.text[:500]}")
        
        print("-" * 50)
        return response.status_code
        
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: Превышено время ожидания")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ ОШИБКА: {e}")
        return None

if __name__ == "__main__":
    status = check_steam_page()
    sys.exit(0)  # Всегда успешный exit для проверки
