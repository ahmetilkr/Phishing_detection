from ultralytics import YOLO
from config import MODEL_PATH



try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Model yüklenirken hata oluştu: {e}")
    model = None


