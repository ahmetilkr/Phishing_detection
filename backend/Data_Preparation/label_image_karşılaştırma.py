

import os
from collections import Counter

image_dir = r"C:\Users\ahmet\Desktop\1k\image"
label_dir = r"C:\Users\ahmet\Desktop\1k\labels"


# 1. Label tarafındaki JSON isimleri
labels = [os.path.splitext(f)[0].lower() for f in os.listdir(label_dir) if f.lower().endswith('.json')]
images = [os.path.splitext(f)[0].lower() for f in os.listdir(image_dir) if not f.startswith('.')]

print(f"--- ANALİZ SONUCU ---")
print(f"Label klasöründeki JSON sayısı: {len(labels)}")
print(f"Image klasöründeki Toplam Dosya sayısı: {len(images)}")

# Çift resmi olan var mı kontrol et (örneğin hem .jpg hem .png olan)
img_counts = Counter(images)
duplicates = [name for name, count in img_counts.items() if count > 1]
if duplicates:
    print(f"\n[!] Aynı ada sahip BİRDEN FAZLA resim bulundu ({len(duplicates)} adet):")
    for d in duplicates:
        print(f" -> {d}")

# JSON'u olmayan resimleri bul
images_set = set(images)
labels_set = set(labels)
missing_in_label = images_set - labels_set

if missing_in_label:
    print(f"\n[!] JSON karşılığı OLMAYAN resim isimleri ({len(missing_in_label)} adet):")
    for m in missing_in_label:
        print(f" -> {m}")