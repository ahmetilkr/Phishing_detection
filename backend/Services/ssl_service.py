import requests
import time
from config import OFFICIAL_DOMAINS__
from Services.threat_intelligence import get_domain_age,check_virustotal
from Services.live_check_service import check_phishing_live





# 3. Tek Bir Kelime İçin crt.sh Sorgu Fonksiyonu
def search_crt(keyword: str, max_retry: int = 13) -> list:
    keyword = keyword.strip()
    if not keyword:
        return []

    url = f"https://crt.sh/?q={keyword}&output=json"

    # Global session yerine her çağrıda temiz header kullanıyoruz
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    for attempt in range(max_retry):
        try:
            # session.get yerine doğrudan izole requests.get kullanıyoruz
            response = requests.get(url, headers=headers, timeout=20)

            if response.status_code == 200:
                try:
                    data = response.json()
                except Exception:
                    data = []

                if not data:
                    wait = min(2 + attempt, 8)
                    print(f"[crt.sh] {keyword} -> Boş cevap ({attempt + 1}/{max_retry}), {wait} sn sonra tekrar denenecek...")
                    time.sleep(wait)
                    continue

                results = []
                seen = set()

                for item in data:
                    cert_id = item.get("id")
                    crtsh_url = f"https://crt.sh/?id={cert_id}"
                    value = item.get("name_value", "")

                    for d in value.split("\n"):
                        d = d.strip().lower()

                        if not d or " " in d or "." not in d:
                            continue

                        clean_domain = d.lstrip("*.")

                        key = (clean_domain, cert_id)
                        if key in seen:
                            continue

                        seen.add(key)

                        results.append({
                            "domain": clean_domain,
                            "crtsh": crtsh_url,
                            "url": f"https://{clean_domain}"
                        })

                return results

            elif response.status_code in (429, 502, 503, 504):
                wait = min(3 + attempt, 10)
                print(f"[crt.sh] HTTP {response.status_code} ({attempt + 1}/{max_retry}), {wait} sn bekleniyor...")
                time.sleep(wait)

            else:
                print(f"[crt.sh] HTTP {response.status_code}")
                return []

        except Exception as e:
            wait = min(2 + attempt, 8)
            print(f"[crt.sh] Hata: {e} ({attempt + 1}/{max_retry})")
            time.sleep(wait)

    return []


def is_official(domain: str) -> bool:
    domain = domain.lower().strip()

    for official in OFFICIAL_DOMAINS__:
        if domain == official:
            return True
        if domain.endswith("." + official):
            return True

    return False




def analyze_crt_results(crt_results, vt_api_key: str = None, scraper_api_key: str = None):
    analyzed = []

    for item in crt_results:
        domain = item["domain"]

        # Resmi domainleri geç
        if is_official(domain):
            continue

        site_url = item.get("url", f"https://{domain}")

        result = {
            "domain": domain,
            "url": site_url,
        }

        # 1. WHOIS Sorgusu (Domain Yaşı Hesaplama)
        try:
            result["domain_yasi"] = get_domain_age(domain)
        except Exception as e:
            result["domain_yasi"] = {"error": str(e)}

        # 2. VirusTotal Sorgusu
        try:
            result["virustotal"] = check_virustotal(domain, vt_api_key)
        except Exception as e:
            result["virustotal"] = {"error": str(e)}

        # 3. Canlı / Geo-Blocking Durum Kontrolü (TR ve Yurt Dışı Erişilebilirlik)
        try:
            live_status = check_phishing_live(site_url, scraper_api_key=scraper_api_key)
            if live_status:
                result["erisilebilirlik"] = live_status
            else:
                result["erisilebilirlik"] = {
                    "url": site_url,
                    "status_code": "OFFLINE",
                    "durum": "SİTE KAPALI / ERİŞİLEMEZ",
                    "is_active": False
                }
        except Exception as e:
            result["erisilebilirlik"] = {"error": str(e)}

        analyzed.append(result)

    return analyzed

