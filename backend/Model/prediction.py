import os
import cv2
from ultralytics import YOLO


def resim_testi(model):
    image_path = r"C:\Users\ahmet\Desktop\test_resmi.jpg"

    results = model.predict(
        source=image_path,
        conf=0.40,   #eşik değeri
        save=False,
        show=True,   #tahmin anlık olarak ekrana gösterilir false ise arka planda yapılır
        device=0
    )    #birden fazla görsel varsa results değişkeni içinde birden fala result nesnesi olur

    for result in results:
        boxes = result.boxes      #
        print(f"\nToplam Bulunan Logo Sayısı: {len(boxes)}")

        for box in boxes:
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            cords = box.xyxy[0].tolist()
            print(f"-> Sınıf: {class_name} | Güven Oranı: %{confidence * 100:.2f} | Koordinat: {cords}")

    cv2.waitKey(0)
    cv2.destroyAllWindows()

def kamera_testi(model):
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    if not cap.isOpened():
        print("Hata: Kamera açılamadı!")
        return

    print("Kamera başlatıldı. Çıkmak için 'q' tuşuna basabilirsiniz.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Görüntü alınamıyor.")
            break

        results = model.predict(
            source=frame,
            conf=0.40,
            device=0,
            stream=True,
            verbose=False
        )

        for result in results:
            annotated_frame = result.plot()   #plot() kutuları resmin üzerine çizer geriye çizilmiş numpy matrisi kalır
            cv2.imshow("YOLOv11 Logo Tespiti - Canlı Kamera", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    model_path = r"runs/detect/train/weights/best.pt"
    model = YOLO(model_path)

    print("--- YOLO TEST MODU SEÇİN ---")
    print("1 - Tek Resim Testi")
    print("2 - Canlı Kamera Testi")

    secim = input("Yapmak istediğiniz işlem numarasını girin (1 veya 2): ")

    if secim == "1":
        resim_testi(model)
    elif secim == "2":
        kamera_testi(model)
    else:
        print("Geçersiz seçim yapıldı.")