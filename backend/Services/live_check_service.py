import requests
import urllib.parse


def check_phishing_live(url, scraper_api_key=None):
    if not url or not isinstance(url, str):
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    }

    # 1. AŞAMA: Türkiye IP'si Kontrolü
    tr_accessible = False
    try:
        r_local = requests.get(
            url,
            headers=headers,
            timeout=3,
            verify=False,
            allow_redirects=True,
        )
        if r_local.status_code < 400:
            tr_accessible = True
    except Exception:
        tr_accessible = False

    # 2. AŞAMA: Yurt Dışı Kontrolü (ScraperAPI)
    proxy_accessible = False
    if scraper_api_key:
        api_url = f"http://api.scraperapi.com?api_key={scraper_api_key}&url={urllib.parse.quote(url)}"
        try:
            r_proxy = requests.get(api_url, timeout=5)
            if r_proxy.status_code < 400:
                proxy_accessible = True
        except Exception:
            proxy_accessible = False

    # --- DURUM DEĞERLENDİRMESİ & NESNE DÖNÜŞÜ ---
    if tr_accessible and proxy_accessible:
        return {
            "url": url,
            "status_code": "GLOBAL",
            "durum": "HER YERE AÇIK",
            "is_active": True
        }
    elif tr_accessible and not proxy_accessible:
        return {
            "url": url,
            "status_code": "ONLY_TR",
            "durum": "SADECE TÜRKİYE'YE AÇIK",
            "is_active": True
        }
    elif not tr_accessible and proxy_accessible:
        return {
            "url": url,
            "status_code": "ONLY_ABROAD",
            "durum": "SADECE YURT DIŞINA AÇIK",
            "is_active": True
        }
    else:
        # Kapalı siteleri elemek için None dönüyoruz
        return None