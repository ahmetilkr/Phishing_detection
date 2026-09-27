import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from ultralytics import YOLO

if __name__ == '__main__':
    # 1. Eğitilmiş en iyi modeli yükle
    model = YOLO("runs/detect/train-2/weights/best.pt")

    # 2. Test veri seti üzerinde değerlendirmeyi başlat
    metrics = model.val(
        data=r"../Model/data.yaml",
        split='test',       # 'val' yerine 'test' klasöründeki verileri kullanır
        conf=0.40,          # Test esnasındaki güven eşiği (%40)
        device=0,           # GPU kullanımı
        plots=True,         # Teste özel Confusion Matrix ve PR grafiklerini oluşturur
        name='test_sonuclari' # Sonuçların kaydedileceği klasör adı
    )

    # 3. Test Metriklerini Terminale Yazdır
    print("\n" + "="*45)
    print("      TEST VERİ SETİ PERFORMANS METRİKLERİ      ")
    print("="*45)
    print(f"Precision (Kesinlik)  : {metrics.results_dict['metrics/precision(B)']:.4f}")
    print(f"Recall (Duyarlılık)   : {metrics.results_dict['metrics/recall(B)']:.4f}")
    print(f"mAP50                 : {metrics.results_dict['metrics/mAP50(B)']:.4f}")
    print(f"mAP50-95              : {metrics.results_dict['metrics/mAP50-95(B)']:.4f}")
    print("="*45)

    # 4. Ham Confusion Matrix Değerleri (TP, FP, FN)
    cm = metrics.confusion_matrix.matrix
    tp = int(cm[0, 0])  # Doğru Tespit Edilen Logo
    fp = int(cm[0, 1])  # Arka Plan Logo Sanılan (Yanlış Alarm)
    fn = int(cm[1, 0])  # Kaçırılan Logo

    print("\n--- TEST VERİSİ DETAYLI TESPİT SAYILARI ---")
    print(f"True Positive  (TP - Doğru Tespit) : {tp}")
    print(f"False Positive (FP - Yanlış Alarm) : {fp}")
    print(f"False Negative (FN - Kaçırılan)    : {fn}")
    print("="*45)