from fastapi import APIRouter
from Services.yolo_service import model
from fastapi import HTTPException, Query
from config import DEFAULT_OFFICIAL_DOMAINS
import requests
import tldextract
from io import BytesIO
from PIL import Image
from Services.threat_intelligence import get_domain_age,check_virustotal
from Services.urlscan_service import urlscan_tarama,keyword
from Services.live_check_service import check_phishing_live
from concurrent.futures import ThreadPoolExecutor
import time
from Services.ssl_service import search_crt,analyze_crt_results
from config import serp_url




router = APIRouter(prefix="/scan", tags=["Tarama İşlemleri"])


@router.post("/multi-engine")
async def scan_multi_engine_images(
        serp_api_key: str,  # SerpApi API Key
        vt_api_key: str = None,  # VirusTotal API Key (İsteğe bağlı)
        query: str = "VakıfBank",
        conf: float = 0.40,
        vt_high_risk_limit: int = 4,
        domain_age_high_risk: int = 240,
        domain_age_medium_risk: int = 750,
        # Query() zorunlu: FastAPI, tekrarlı query param'larını (engines=a&engines=b)
        # list olarak parse edebilmek için Query wrapper'ı gerektirir.
        engines: list[str] = Query(default=["google_images", "yandex_images", "bing_images"]),
        official_domains: list[str] = Query(default=None) #"Bu parametre karmaşık bir liste olsa bile sakın Body (JSON) içinde arama;
                                                          # bunu URL üzerindeki Query parametrelerinden oku."
):



    if model is None:
        raise HTTPException(status_code=500, detail="Model yüklü değil.")

    # SerpApi Google Images API Adresi ve Parametreleri

    # DEBUG: Frontend'den gelen ham parametre
    print(f"DEBUG official_domains parametresi: {official_domains}")
    print(f"DEBUG official_domains is None: {official_domains is None}")
    print(f"DEBUG official_domains type: {type(official_domains)}")
    # Kullanıcı frontend'den domain gönderdiyse onu kullan, göndermemişse varsayılan listeyi kullan
    OFFICIAL_DOMAINS = official_domains if official_domains is not None else DEFAULT_OFFICIAL_DOMAINS
    print(f"DEBUG Kullanılan OFFICIAL_DOMAINS: {OFFICIAL_DOMAINS}")

    taranan_toplam = 0
    logo_bulunan_toplam = 0
    supheli_siteler = []
    gorulen_linkler = set()

    for engine in engines:
        params = {
            "engine": engine,
            "api_key": serp_api_key,
        }
        if engine == "yandex_images":
            params["text"] = query  # Yandex'te kelime parametresi 'text'tir
            params["recent"] = "true"  # Son 7 gün içindeki görselleri filtreler
        elif engine == "yahoo_images":
            params["p"] = query  # Yahoo Görseller'de arama kelimesi 'p' parametresidir
            params["imgt"] = "day"  # Son 24 saat filtresi
        elif engine == "bing_images":
            params["q"] = query  # Yahoo Görseller'de arama kelimesi 'p' parametresidir
            params["age"] = "lt1440"  # Son 24 saat filtresi
        elif engine == "google_images":
            params["q"] = query
            params["period_unit"] = "d"  # Gün birimi
            params["period_value"] = "1" # Son 24 saat filtresi
        else:
            # Tanımlanmamış veya desteklenmeyen bir motor gelirse hata vermesini önlemek için
            print(f"Uyarı: Desteklenmeyen arama motoru -> {engine}")
            continue

        try:
            res = requests.get(serp_url,
                               params=params, timeout=10)  # Belirtilen adrese bir HTTP GET isteği (veri çekme isteği) gönderir.
            res.raise_for_status()  # İsteğin başarılı olup olmadığını kontrol eder. Eğer bir hata varsa
            # (örneğin API key yanlışsa veya kota dolmuşsa) kodun devam etmesini engelleyip hata fırlatır
            search_results = res.json()  # çıktıyı kullanılabilir dict formatına dönüştürür
        except Exception as e:
            print(f"{engine} motorunda hata: {e}")
            continue
        # exception hangi hata gelirse gelsin yakalanmasını sağlar ve bunu e değişkeninde tutar

        # SerpApi gorsel sonuclarini 'images_results' dizisinde dondurur
        items = search_results.get("images_results",
                                   [])  # get() dictten anahtara bağlı değer almamızı sağlar direk ["key"] olarakta yapabiliriz
        # ama böyle yaparsak keyi buluamazsa sistem çökebilir gette ise bulamazsa ikinci parametre olan değeri döndürür burada [] boş liste
        if not items:
            continue

        for item in items:
            # SerpApi formatı: 'original' -> Ham Resim URL'si, 'link' -> Resmi Yayımlayan Web Sitesi URL'si
            image_url = item.get("original") or item.get("thumbnail")
            context_link = item.get("link", image_url)  # Görselin bulunduğu Web Sitesi Linki

            if not image_url:
                continue

            if image_url in gorulen_linkler or context_link in gorulen_linkler:
                continue

            gorulen_linkler.add(image_url)
            gorulen_linkler.add(context_link)
            taranan_toplam += 1

            # 1. Görseli indir
            try:
                headers = {'User-Agent': 'Mozilla/5.0'}  # Bazı sitelerin bot engeline takılmaması için tarayıcı bilgisi
                img_res = requests.get(image_url, headers=headers, timeout=5)
                # İnternette gördüğün her şey aslında bilgisayarına veya telefonuna iner.
                # Bir web sitesine girdiğinde, tarayıcın arka planda o sitenin resimlerini, yazılarını ve kodlarını sunucudan talep eder (GET).
                # Sunucu bu verileri senin cihazına gönderir.
                # Tarayıcın bunları geçici bellek tutanağına (RAM) alır ve sana ekranda gösterir.
                # Yani sen bilgisayarına sağ tıklayıp "Resmi Farklı Kaydet" demesen bile, ekranda o resmi görüyorsan,
                # o resmin verisi zaten internetten çekilmiş ve senin cihazının belleğine  gelmiştir.
                # İşte Python'daki requests.get() komutu tam olarak bunu yapar:
                # Şu web adresindeki resmin verisini internetten çek ve benim Python programımın erişebileceği belleğe (RAM'e) getir.
                # biz burda direk resim urlsine get yaptığımız için o urldeki resim verisini çekiyoruz bilgilerini taşıyan nesne döner.
                img_res.raise_for_status()
                image = Image.open(
                    BytesIO(img_res.content))  # img_res.content dönen nesnenin 0 ve 1'lerden oluşan resim verisini alıyor
                # Image.open diskteki yolu vererek dosyayı açar ama bizim verimiz ramda olduğu için BytesIO ona diskteymiş gibi davran der bir de ımage.open 0 1 lerden
                #oluşan veriyi rgb değerlerine çevirir.
            except Exception:
                continue  # Resim indirilemediyse diğer resmi tara

            # 2. YOLOv11 ile Logo Taraması Yap
            results = model.predict(source=image, conf=conf, device=0, verbose=False)

            # Resim üzerinde en az 1 logo tespit edildi mi?
            has_logo = len(results[0].boxes) > 0

            if has_logo:
                logo_bulunan_toplam += 1

                # 3. Görselin Yayınlandığı Domain'i Bul
                extracted = tldextract.extract(context_link)  # extract() gelen linki parçalara ayırır
                # www.gemini.google.com.tr
                # gemini -->subdomain
                # google -->domain
                # com    -->suffix
                domain_name = f"{extracted.domain}.{extracted.suffix}"  # Örn: vakifbank.com.tr veya rastele-site.com

                # 4. Orijinallik / Güvenlik Kontrolü
                # [GÜNCELLENDİ] Sadece tam domain değil, context_link resmi hesapları içeriyor mu kontrol edilir
                is_official = any(off_domain in context_link for off_domain in OFFICIAL_DOMAINS)

                if is_official:      #site güvenliyse ekrana basma
                    continue

                else:
                    # [YENİ EKLENDİ] WHOIS ile Domain Yaşı Sorgulanır
                    age_days = get_domain_age(domain_name)
                    domain_yasi_mesaji = f"{age_days} Günlük" if age_days is not None else "WHOIS Kaydı Bulunamadı"

                    # [YENİ EKLENDİ] VirusTotal API Key varsa tarama yapılır
                    vt_sonuc = check_virustotal(domain_name, vt_api_key) if vt_api_key else {"mesaj": "VT Key Sağlanmadı"}
                    vt_flag_count = vt_sonuc.get("zararli_sayisi", 0)

                    is_age_valid = isinstance(age_days, int)

                    if vt_flag_count >= vt_high_risk_limit:
                        durum_mesaji = f"YÜKSEK RİSK / DOLANDIRICI (VirusTotal: {vt_flag_count} Engelleme)"
                    elif vt_flag_count > 0:
                        durum_mesaji = f"DÜŞÜK RİSK (VirusTotal: {vt_flag_count} Şüpheli İşaretleme)"
                    elif is_age_valid and age_days < domain_age_high_risk:
                        durum_mesaji = f"YÜKSEK RİSK / ŞÜPHELİ (Site Henüz {age_days} Günlük!)"
                    elif is_age_valid and age_days < domain_age_medium_risk:
                        durum_mesaji = f"ORTA RİSK (Site {age_days} Günlük)"
                    else:
                        durum_mesaji = "ŞÜPHELİ / UNAPPROVED (Detaylı İnceleme Gerekebilir)"
                # [GÜNCELLENDİ] Çıktı sözlüğüne yeni güvenlik alanları eklendi
                supheli_siteler.append({
                    "tespit_edildigi_motor": engine,
                    "site_adi": domain_name,
                    "durum": durum_mesaji,
                    "domain_yasi": domain_yasi_mesaji,  # [YENİ EKLENDİ]
                    "virustotal_analiz": vt_sonuc,  # [YENİ EKLENDİ]
                    "gorsel_linki": image_url,
                    "kaynak_sayfa": context_link,
                    "bulunan_logo_sayisi": len(results[0].boxes)
                })

    return {
        "taranan_gorsel_sayisi": taranan_toplam,
        "logo_tespit_edilen_gorsel_sayisi": logo_bulunan_toplam,
        "analiz_sonuclari": supheli_siteler
    }


@router.post("/favicon-html-arama")
def urlscan_endpoint(urlscan_api_key: str = None, scraper_api_key: str = None):
    urlscan_tarama(urlscan_api_key=urlscan_api_key)
    urls = keyword("url")

    with ThreadPoolExecutor(max_workers=10) as executor:
        sonuclar = list(
            executor.map(
                lambda url: check_phishing_live(
                    url,
                    scraper_api_key=scraper_api_key
                ),
                urls,
            )
        )

    # Kapalı siteleri (None olanları) tamamen listeden çıkartıyoruz
    aktif_sonuclar = [res for res in sonuclar if res is not None]

    return {
        "status": "success",
        "results": aktif_sonuclar,
    }



# 4. API Endpoint (Sırayla Sorgulama Yapar)
@router.post("/ssl-search")
def get_domains(keywords: str, vt_api_key: str = None, scraper_api_key: str = None):
    # Kullanıcıdan gelen "vakifbank, vakıfbank" gibi metni parçalıyoruz
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]

    results = {}

    # Kelimeleri paralelleştirmeden, TEK TEK sorguluyoruz
    for index, keyword in enumerate(keyword_list):
        domains = search_crt(keyword)
        # scraper_api_key parametresini analiz fonksiyonuna geçiriyoruz
        results[keyword] = analyze_crt_results(
            domains,
            vt_api_key=vt_api_key,
            scraper_api_key=scraper_api_key
        )
        if index < len(keyword_list) - 1:
            time.sleep(1.5)

    return {
        "status": "success",
        "results": results
    }
