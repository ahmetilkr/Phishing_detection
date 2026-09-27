import whois
from datetime import datetime, timezone
import requests



def get_domain_age(domain: str):
    """

     WHOIS sorgusu atarak alan adının yaşını gün bazında hesaplar.
    """
    try:
        w = whois.whois(domain) #WHOIS Nedir? İnternetteki tüm domainlerin  kime ait olduğunu, hangi firmadan alındığını,
        # ne zaman kurulduğunu ve ne zaman süresinin biteceğini tutan resmi bir kayıttır.
        #Arka planda WHOIS sunucularına bağlanır ve o siteye ait tüm  bilgileri çekip w adını verdiğin bir nesnenin içine yükler.
        creation_date = w.creation_date  #oluşturalan nesneden (sitenin bilgilerini tutar) oluşturulma tarihini al

        # Bazı domainlerde birden fazla kayıt tarihi dönebilir (liste halinde)
        if isinstance(creation_date, list):  #bir nesnenin belirli veri tipi olup olumadığını komtrol eder creation_date bir liste mi
            creation_date = creation_date[0]  #bazı siteler güncelleme yaptığında yeni olarak gözükür [0] ise en eski tarihi alır

        if creation_date:
            # Zaman dilimi uyuşmazlıklarını giderme (UTC'ye eşitleme)
            if creation_date.tzinfo is not None:   #tzinfo datatime özelliği tarihin yanında saat bilgi var mı diye bakar
                #creation_date.tzinfo 13:00 (+03:00) şu şekilde bir şey var trde saat 1 ingiltereye göre 3 saat ileride
                creation_date = creation_date.astimezone(timezone.utc).replace(tzinfo=None)
                #astimezone() içine verdiğin hedef saat dilimine göre tarihi ve saati matematiksel olarak yeniden hesaplar.
                #timezone.utc utc(dünya ortak saati) kullan yani ingiltereyi baz al deriz
                #bunları yapınca 13:00 (+03:00) olan saat 10:00 (00:00) olur..replace(tzinfo=None) ile  (00:00) etiketini sökeriz 10:00 kalır
                #artık bütün saatleri tek bir standarta dönüştürdük hepsi ingiltereyi baz alarak hesaplandı
            now = datetime.now(timezone.utc).replace(tzinfo=None) #datetime.now bilgisayarındaki saati alır timezonu utc olarak alır
                #daha sonra timezone bilgisini söker yukarıdakiyle aynı işlemler
            age_days = (now - creation_date).days
            return age_days
        else:
            # WHOIS sunucusu cevap verdi ama olusturulma tarihi bulunamadi
            return "Kayıt Tarihi Yok"
    except Exception as e:
        print(f"WHOIS sorgulama hatası ({domain}): {e}")
        return "WHOIS Alınamadı"




def check_virustotal(domain: str, api_key: str):
    """
    [YENİ EKLENDİ] VirusTotal v3 API'sini kullanarak domain analiz raporunu sorgular.
    """
    if not api_key:
        return {"zararli_sayisi": 0, "mesaj": "VT Key Sağlanmadı"}

    url = f"https://www.virustotal.com/api/v3/domains/{domain}"
    headers = {
        "accept": "application/json",   #virustotalden dönen veri json olsun html olarak gelmesin
        "x-apikey": api_key
    }

    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()  #gelen json verisini pythonda kolay okuyabilmek için dicte dönüştürüyoruz
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            #malicious Virüs/Siber güvenlik firmalarının kaç tanesinin bu domain için "Zararlı / Kötü Amaçlı" dediğini çeker.
            suspicious = stats.get("suspicious", 0) #Kaç tanesinin "Şüpheli" dediğini çeker.

            return {
                "zararli_sayisi": malicious + suspicious,
                "detay": stats
            }
        elif res.status_code == 404:
        #Sorguladığın domain (örneğin çok yeni açılmış çakma bir site) henüz dünyada kimse tarafından VirusTotal'a taranması için gönderilmemiştir.
            return {"zararli_sayisi": 0, "mesaj": "VT kayıtlarında bulunamadı"}
    except Exception as e:
        print(f"VirusTotal API hatası ({domain}): {e}")

    return {"zararli_sayisi": 0, "hata": "Sorgu yapılamadı"}

