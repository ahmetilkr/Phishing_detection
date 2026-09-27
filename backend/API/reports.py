

from fastapi import APIRouter,HTTPException,Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from config import DEFAULT_OFFICIAL_DOMAINS
from datetime import datetime
from Services.pdf_service import generate_pdf_from_dict
from API.scan import scan_multi_engine_images,urlscan_endpoint,get_domains




router = APIRouter(prefix="/report", tags=["Raporlama"])


@router.post("/full-report")
async def generate_full_report(
        keywords: str = Query(..., description="ssl sertifkası için virgülle ayrılmış arama terimleri (Örn: vakifbank, vakıfbank)"),
        serp_api_key: Optional[str] = Query(None, description="SerpApi Key"),
        vt_api_key: Optional[str] = Query(None, description="VirusTotal API Key"),
        scraper_api_key: Optional[str] = Query(None, description="ScraperAPI Key"),
        urlscan_api_key:Optional[str] = Query(None, description="UrlscanAPI Key"),
        conf: float = Query(0.40, description="YOLO güven eşiği"),
        engines: List[str] = Query(
            default=["google_images", "yandex_images", "bing_images"],
            description="Görsel arama motorları"
        ),
        official_domains: Optional[List[str]] = Query(
            default=DEFAULT_OFFICIAL_DOMAINS,
            description="scan_multi_engine_images de hariç tutulacak/Güvenli kabul edilecek resmi domainler (Boş bırakılırsa varsayılan liste kullanılır)"
        ),
        as_pdf: bool = Query(True, description="True ise PDF dosyası indirir, False ise JSON döner")
):
    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]  # if x yaparsan

    if not keyword_list:
        raise HTTPException(status_code=400, detail="En az bir arama kelimesi girmelisiniz.")

    # 1. Görsel Logo Taramaları
    gorsel_raporlari = {}
    if serp_api_key:
        for kw in keyword_list:
            gorsel_raporlari[kw] = await scan_multi_engine_images(
                serp_api_key=serp_api_key,
                vt_api_key=vt_api_key,
                query=kw,
                conf=conf,
                engines=engines,
                official_domains=official_domains
            )

    # 2. Favicon & HTML Taraması
    favicon_raporu = urlscan_endpoint(
        scraper_api_key=scraper_api_key,
        urlscan_api_key=urlscan_api_key
    )

    # 3. SSL / CRT.sh Taraması
    ssl_raporu = get_domains(
        keywords=keywords,
        vt_api_key=vt_api_key,
        scraper_api_key=scraper_api_key
    )

    print("DEBUG SSL RAPORU ÇIKTISI:", ssl_raporu)

    # 4. Tüm Verileri Birleştirme
    toplam_rapor = {
        "tarih": datetime.now().strftime("%d-%m-%Y %H:%M:%S UTC"),
        "sorgulanan_kelimeler": keyword_list,
        "gorsel_tarama_sonuclari": gorsel_raporlari,
        "favicon_html_sonuclari": favicon_raporu,
        "ssl_crt_sonuclari": ssl_raporu
    }

    # 5. PDF Dönüştürme ve İndirme Akışı
    if as_pdf:
        pdf_file = generate_pdf_from_dict(toplam_rapor)
        filename = f"tarama_raporu_{datetime.now().strftime('%d%m%Y_%H%M%S')}.pdf"  #strftime genelde zamanı string olarak kaydetmek için kullanılır
        #eğer strftime olmadan yapsaydık 2026-08-07 17:41:29.345678 gibi bir şey çıkardı - . gibi karakterler dosya isminde olmaz

        return StreamingResponse(
            pdf_file,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    return toplam_rapor


