import json
import glob
import os


def convert_labelme_json_auto(json_dir, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    json_files = glob.glob(os.path.join(json_dir, "*.json"))

    if not json_files:
        print(f"Hata: '{json_dir}' dizininde hiçbir .json dosyası bulunamadı.")
        return

    # 1. Aşama: Veri setindeki tüm benzersiz etiketleri topla
    detected_labels = set()
    for json_file in json_files:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for shape in data.get('shapes', []):
                detected_labels.add(shape['label'])

    if not detected_labels:
        print("Uyarı: JSON dosyalarının içinde hiç 'shapes' veya 'label' bulunamadı.")
        return

    # Sınıf haritasını dinamik oluştur (0, 1, 2...)
    class_mapping = {label: idx for idx, label in enumerate(sorted(detected_labels))}
    print("Tespit edilen sınıflar ve ID eşleşmeleri:")
    for label, class_id in class_mapping.items():
        print(f"  - '{label}' -> {class_id}")

    # 2. Aşama: YOLO formatına dönüştür
    converted_count = 0
    for json_file in json_files:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        img_width = data['imageWidth']
        img_height = data['imageHeight']

        yolo_lines = []

        for shape in data.get('shapes', []):
            label = shape['label']
            class_id = class_mapping[label]
            points = shape['points']

            xs = [p[0] for p in points]
            ys = [p[1] for p in points]

            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)

            x_center = ((x_min + x_max) / 2.0) / img_width
            y_center = ((y_min + y_max) / 2.0) / img_height
            w = (x_max - x_min) / img_width
            h = (y_max - y_min) / img_height

            x_center = max(0.0, min(1.0, x_center))
            y_center = max(0.0, min(1.0, y_center))
            w = max(0.0, min(1.0, w))
            h = max(0.0, min(1.0, h))

            yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}")

        base_name = os.path.splitext(os.path.basename(json_file))[0]
        txt_path = os.path.join(output_dir, f"{base_name}.txt")

        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(yolo_lines))

        if yolo_lines:
            converted_count += 1

    print(f"\nİşlem tamamlandı: {len(json_files)} JSON dosyasından {converted_count} tanesi dolu olarak aktarıldı.")


if __name__ == "__main__":
    convert_labelme_json_auto(
        json_dir=r"C:\Users\ahmet\Desktop\hazır_veri_son_hali-Kopya\labels",
        output_dir=r"C:\Users\ahmet\Desktop\hazır_veri_son_hali-Kopya\labels_txt"
    )