import cv2
import numpy as np
import os
import random
from PIL import Image

# --- Ayarlar ---
# Arka plan resimlerinin olduğu klasör
BACKGROUNDS_DIR = r"C:\Users\ahmet\Desktop\sentetik_veri"
# Arka planı şeffaf (PNG) logo klasörü
LOGOS_DIR = r"C:\Users\ahmet\Desktop\logolar"
# Sonuçların kaydedileceği ana klasör
OUTPUT_DIR = r"C:\Users\ahmet\Desktop\uretilmis_veri"

# Logonun arka plandaki kaplayacağı alanın rastgele boyutu (% min, % max)
LOGO_SCALE_RANGE = (0.05, 0.20)
# Maksimum döndürme açısı (rastgele ±)
MAX_ROTATION = 15
# Her bir arka plan için kaç sentetik görsel üretilsin?
COUNT_PER_BACKGROUND = 3

# YOLO Sınıf ID'si (Logo için 0 yapabilirsiniz)
CLASS_ID = 0

# Klasörleri oluştur
os.makedirs(os.path.join(OUTPUT_DIR, 'images'), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, 'labels'), exist_ok=True)

# Dosya listelerini al
bg_files = [f for f in os.listdir(BACKGROUNDS_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
logo_files = [f for f in os.listdir(LOGOS_DIR) if f.lower().endswith('.png')]  # PNG olmalı (şeffaflık için)

if not bg_files or not logo_files:
    print("Hata: Arka plan veya logo klasörleri boş.")
    exit()

generated_count = 0

print(f"{len(bg_files)} arka plan ve {len(logo_files)} logo bulundu. Üretim başlıyor...")

for bg_file in bg_files:
    # 1. Arka planı yükle
    bg_path = os.path.join(BACKGROUNDS_DIR, bg_file)
    bg_pil = Image.open(bg_path).convert('RGB')
    bg_w, bg_h = bg_pil.size

    bg_base_name = os.path.splitext(bg_file)[0]

    for i in range(COUNT_PER_BACKGROUND):
        # Her üretim için rastgele bir logo seç
        logo_file = random.choice(logo_files)
        logo_pil = Image.open(os.path.join(LOGOS_DIR, logo_file))

        # 2. Logoyu Rastgele Boyutlandır ve Döndür
        scale = random.uniform(*LOGO_SCALE_RANGE)
        new_logo_h = int(bg_h * scale)
        # Oranı koruyarak genişliği hesapla
        aspect_ratio = logo_pil.size[0] / logo_pil.size[1]
        new_logo_w = int(new_logo_h * aspect_ratio)

        logo_resized = logo_pil.resize((new_logo_w, new_logo_h), Image.Resampling.LANCZOS)

        # Döndürme
        angle = random.uniform(-MAX_ROTATION, MAX_ROTATION)
        # expand=True dersek dönen logonun köşeleri kesilmez, kutusu büyür
        logo_rotated = logo_resized.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        rot_w, rot_h = logo_rotated.size

        # 3. Rastgele Konum Seç
        # Logonun tamamının ekranda kalması için sınırlar
        max_x = bg_w - rot_w
        max_y = bg_h - rot_h

        if max_x < 0 or max_y < 0: continue  # Logo arka plandan büyükse atla

        paste_x = random.randint(0, max_x)
        paste_y = random.randint(0, max_y)

        # 4. Logoyu Yapıştır (Compositing)
        # logo_rotated.split()[-1] maske olarak şeffaf kısımları korur
        temp_bg = bg_pil.copy()
        temp_bg.paste(logo_rotated, (paste_x, paste_y),
                      logo_rotated.split()[-1] if logo_rotated.mode == 'RGBA' else None)

        # 5. YOLO Koordinatlarını Hesapla ve Normalize Et
        # Bounding Box Merkez Koordinatları
        center_x = paste_x + (rot_w / 2)
        center_y = paste_y + (rot_h / 2)

        # Normalize Et (0-1 arası)
        norm_center_x = center_x / bg_w
        norm_center_y = center_y / bg_h
        norm_width = rot_w / bg_w
        norm_height = rot_h / bg_h

        # Sınırları kontrol et (0'dan küçük veya 1'den büyük olmamalı)
        norm_center_x = max(0, min(1, norm_center_x))
        norm_center_y = max(0, min(1, norm_center_y))
        norm_width = max(0, min(1, norm_width))
        norm_height = max(0, min(1, norm_height))

        # 6. Kaydet
        output_base_name = f"{bg_base_name}_syn_{generated_count}"

        # Görüntüyü Kaydet (OpenCV ile kaydetmek için RGB->BGR yapmalıyız)
        final_img_cv = cv2.cvtColor(np.array(temp_bg), cv2.COLOR_RGB2BGR)
        cv2.imwrite(os.path.join(OUTPUT_DIR, 'images', f"{output_base_name}.jpg"), final_img_cv)

        # Etiketi YOLO Formatında Kaydet (class_id x_center y_center width height)
        label_line = f"{CLASS_ID} {norm_center_x:.6f} {norm_center_y:.6f} {norm_width:.6f} {norm_height:.6f}\n"
        with open(os.path.join(OUTPUT_DIR, 'labels', f"{output_base_name}.txt"), 'w') as f:
            f.write(label_line)

        generated_count += 1

print(f"İşlem tamamlandı. Toplam {generated_count} sentetik görsel ve YOLO etiketi üretildi.")
print(f"Sonuçlar '{OUTPUT_DIR}' klasöründe.")