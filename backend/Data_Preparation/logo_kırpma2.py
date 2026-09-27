import cv2
import numpy as np
import os

# 1. Görseli yükle
img_path = r"C:\Users\ahmet\Desktop\staj_amblem\2.png"
img = cv2.imread(img_path)

if img is None:
    raise FileNotFoundError(f"Görsel bulunamadı: {img_path}")

# 2. HSV Renk Uzayına Çevir
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# 3. SARI AMBLEMİ TESPİT ET
# HSV formatında Sarı Renk Aralığı (Hue: 15-35, Saturation: 80-255, Value: 100-255)
lower_yellow = np.array([15, 80, 100])
upper_yellow = np.array([35, 255, 255])
yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

# 4. Kontur Bul ve İçini Doldur (Beyaz V harfi dahil dış amblem bölgesini tek parça al)
contours, _ = cv2.findContours(yellow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

if contours:
    # En büyük konturu (Sarı Amblemi) bul
    c = max(contours, key=cv2.contourArea)

    # Amblemin içini tam dolduran ham maske (İçteki beyaz V harfini de kapsar)
    emblem_mask = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.drawContours(emblem_mask, [c], -1, 255, thickness=cv2.FILLED)

    # --- KENAR PÜRÜZSÜZLEŞTİRME (ANTI-ALIASING) ADIMLARI ---

    # A) Morfolojik Kapanma: Dış kenarlardaki küçük pürüzleri ve girintileri düzeltir
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    emblem_mask = cv2.morphologyEx(emblem_mask, cv2.MORPH_CLOSE, kernel)

    # B) Blur ile kenarlara yumuşak geçiş (Feathering) ver
    smooth_alpha = cv2.GaussianBlur(emblem_mask, (5, 5), 0)

    # 5. BGRA GÖRSELİNİ OLUŞTUR VE YUMUŞATILMIŞ ALPHA KANALINI AT
    bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = smooth_alpha  # Yumuşak alpha kanalını uyguluyoruz

    # 6. OTOMATİK TAM KIRPMA
    x, y, w, h = cv2.boundingRect(c)
    padding = 10  # Yumuşatmanın kesilmemesi için kenar payı
    y1 = max(0, y - padding)
    y2 = min(bgra.shape[0], y + h + padding)
    x1 = max(0, x - padding)
    x2 = min(bgra.shape[1], x + w + padding)

    crop_emblem = bgra[y1:y2, x1:x2]

else:
    crop_emblem = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

# 7. Kaydet
output_dir = r"/"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "sari_amblem_beyaz_v.png")

cv2.imwrite(output_path, crop_emblem)
print("İşlem tamamlandı! Sarı amblem ve içindeki beyaz V harfi pürüzsüz şekilde kırpıldı.")