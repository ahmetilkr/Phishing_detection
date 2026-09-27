import os

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from ultralytics import YOLO

if __name__ == '__main__':
    # Pre-trained YOLOv11 Small
    model = YOLO("yolo11s.pt")

    # Eğitimi başlat
    results = model.train(
        data=r"C:\Users\ahmet\Desktop\staj_kod\data.yaml",
        epochs=100,
        imgsz=800,
        batch=20,
        device=0,  # GPU kullanımı
        patience=20,
        workers=2,  # Windows için güvenli worker sayısı

        # Augmentation
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=0.5,
        close_mosaic=10
    )