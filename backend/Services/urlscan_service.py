import hashlib
import json
import os
from datetime import datetime, timezone
import requests
import urllib3
from config import REAL_FAVICON_URL, OUTPUT_FILE, WHITELIST_DOMAINS, urlscan_url

urllib3.disable_warnings()


def _is_whitelisted(domain_or_site: str) -> bool:
    domain_or_site = (domain_or_site or "").lower()
    return any(w in domain_or_site for w in WHITELIST_DOMAINS)


def _urlscan_api_search(query: str, urlscan_api_key: str = None, max_results: int = 50) -> list:
    headers = {
        "Accept": "application/json",
    }
    if urlscan_api_key:
        headers["API-Key"] = urlscan_api_key

    params = {
        "q": query,
        "size": min(max_results, 50),
    }

    try:
        response = requests.get(urlscan_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as e:
        print(f"[_urlscan_api_search] Hata: {e}")
        return []


def _extract_urlscan_fields(hit: dict) -> dict:
    page = hit.get("page", {})
    task = hit.get("task", {})

    domain = page.get("domain", "")
    url = page.get("url", "")
    ip = page.get("ip", "")
    title = page.get("title", "")
    screenshot = hit.get("screenshot", "")

    return {
        "site": domain if domain else url,
        "url": url,
        "ip": ip,
        "title": title,
        "screenshot": screenshot,
        "scan_id": task.get("uuid", ""),
    }


def compute_favicon_sha256(favicon_url: str) -> str:
    try:
        response = requests.get(
            favicon_url, timeout=10, headers={"User-Agent": "Mozilla/5.0"}
        )
        response.raise_for_status()
        return hashlib.sha256(response.content).hexdigest()
    except Exception as e:
        print(f"[compute_favicon_sha256] Hata: {e}")
        return ""


def favicon_scan(urlscan_api_key: str = None, favicon_url: str = REAL_FAVICON_URL, max_results: int = 50) -> list:
    print("[favicon_scan] Gerçek favicon indiriliyor ve SHA-256 hesaplanıyor...")
    favicon_hash = compute_favicon_sha256(favicon_url)
    if not favicon_hash:
        return []

    print(f"[favicon_scan] Hesaplanan Favicon SHA-256: {favicon_hash}")
    query = f'page.hash:"{favicon_hash}" OR page.url:"*vakifbank.com.tr/favicon.ico*"'

    findings = []
    try:
        hits = _urlscan_api_search(query, urlscan_api_key=urlscan_api_key, max_results=max_results)
        for hit in hits:
            fields = _extract_urlscan_fields(hit)
            if _is_whitelisted(fields["site"]):
                continue

            fields["reason"] = "favicon_match"
            fields["favicon_sha256"] = favicon_hash
            findings.append(fields)
    except Exception as e:
        print(f"[favicon_scan] Sorgu hatası: {e}")

    return findings


def html_content_scan(urlscan_api_key: str = None, max_results: int = 50) -> list:
    findings = []
    seen_sites = set()

    whitelist_exclusions = " ".join([f'NOT page.domain:"{w}"' for w in WHITELIST_DOMAINS])
    query = f'(page.text:"vakifbank" OR page.title:"vakifbank" OR page.domain:*vakifbank*) {whitelist_exclusions}'

    try:
        hits = _urlscan_api_search(query, urlscan_api_key=urlscan_api_key, max_results=max_results)
        for hit in hits:
            fields = _extract_urlscan_fields(hit)

            if _is_whitelisted(fields["site"]) or fields["site"] in seen_sites:
                continue

            fields["reason"] = "brand_keyword_match"
            findings.append(fields)
            seen_sites.add(fields["site"])
    except Exception as e:
        print(f"[html_content_scan] Sorgu hatası: {e}")

    return findings


def urlscan_tarama(urlscan_api_key: str = None):
    all_results = {
        "scan_date": datetime.now(timezone.utc).isoformat(),
        "favicon_matches": [],
        "html_content_matches": [],
    }

    try:
        all_results["favicon_matches"] = favicon_scan(urlscan_api_key=urlscan_api_key)
    except Exception as e:
        print(f"[main] Favicon taraması başarısız: {e}")

    try:
        all_results["html_content_matches"] = html_content_scan(urlscan_api_key=urlscan_api_key)
    except Exception as e:
        print(f"[main] HTML içerik taraması başarısız: {e}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)


def keyword(kw):
    """Hem favicon hem de html tarama sonuçlarındaki URL'leri güvenle toplar."""
    try:
        if not os.path.exists(OUTPUT_FILE):
            return []

        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data_ = json.load(f)

        data = data_.get("html_content_matches", []) + data_.get("favicon_matches", [])

        results = []
        for item in data:
            val = item.get(kw)
            if val and isinstance(val, str) and "urlscan.io/result" not in val:
                if val not in results:
                    results.append(val)
        return results
    except Exception as e:
        print(f"[keyword] Hata: {e}")
        return []