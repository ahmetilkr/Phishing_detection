

from fastapi import APIRouter
from Services.yolo_service import model
from fastapi import File, HTTPException,UploadFile
import cv2
import numpy as np
from PIL import Image
from fastapi.responses import StreamingResponse
import io
import requests
from io import BytesIO


router = APIRouter(prefix="/predict", tags=["Model Tahminleri"])

@router.post("/json")
def predict_json(file: UploadFile = File(...), conf: float = 0.40):
    # UploadFile: Python'a "Bu değişken bir dosya nesnesidir" der (Veri Tipi).
    # File(): FastAPI'ye "Bu dosyayı kullanıcının bilgisayarından dosya yükleme kutusuyla çek" der
    # async olma amacı uzun süren işlemlerde kesintiye uğramaması için await ile işlem bitene kadar durur diğer kullanıcıya öncelik verir
    """
    Resmi alır, nesne tespiti yaparlar ve koordinatları/sınıfları JSON formatında döndürür.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model yüklü değil.")
    # HTTPException bir web hatası döndürür 500 sunucu hatası vs raise hatayı fırlatmak için anahtar kelime

    # Gelen dosyayı oku ve OpenCV görsel formatına dönüştür
    #kullanıcı dosya yüklediği zaman direk rame gitmez ya dosya çok büyükse sunucunun ramini şişirmez önce sunucu diskine kaydedilir ramde meta verileri ve
    #pointer tutulur daha sonra read() diyince rame çekilme işlemi yapılır.
    contents = file.read()
    nparr = np.frombuffer(contents, np.uint8)
    # internete dosya yüklenince anlamsız 1 ve 0 lar olur bunu np.frombuffer() unsigned 8 bit yani 0 ile 255 arası matrislere dönüştürüyoruz.
    # matris tek boyutlu
    image = cv2.imdecode(nparr,
                         cv2.IMREAD_COLOR)  # imdecode np.frombuffer ile gelen matrisi cv2 nin anlayacağı 3 boyutlu matris formatına
    # dönüştürme işlemi yapar
    if image is None:
        raise HTTPException(status_code=400, detail="Geçersiz resim dosyası.")

    # Tahmin yap
    results = model.predict(source=image, conf=conf, device=0, verbose=False)

    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            coords = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]

            detections.append({
                "sinif": class_name,
                "guven_orani": round(confidence * 100, 2),
                "koordinatlar": {
                    "xmin": round(coords[0], 2),
                    "ymin": round(coords[1], 2),
                    "xmax": round(coords[2], 2),
                    "ymax": round(coords[3], 2)
                }
            })

    return {
        "toplam_tespit": len(detections),
        "tespitler": detections
    }


@router.post("/image")
async def predict_image(file: UploadFile = File(...), conf: float = 0.40):
    """
    Resmi alır, üzerine tespit kutularını çizer ve çizilmiş resmi geri döndürür.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model yüklü değil.")

    contents =await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # cv2.IMREAD_COLOR renkli olarak yüklemeyi sağlar
    if image is None:
        raise HTTPException(status_code=400, detail="Geçersiz resim dosyası.")

    results = model.predict(source=image, conf=conf, device=0, verbose=False)

    # Kutuları resmin üzerine çiz
    annotated_frame = results[0].plot()  # yolonun çizmek için kullandığı araç opencv dir opencv bgr kullanır diğer her şey rgb insanlarda
    # rgb olarak algılar yani bu  annotated_frame bgr a göredir

    annotated_frame_rgb = cv2.cvtColor(annotated_frame,
                                       cv2.COLOR_BGR2RGB)  # burada bgrı rgb ye dönüştürme işlemi yapıyoruz
    pil_img = Image.fromarray(annotated_frame_rgb)  # matrisi artık resim nesnesine çeviririz

    # Resmi byte akışına dönüştür
    img_byte_arr = io.BytesIO()  #io.BytesIO(): Sanal bir dosya oluşturur. Sabit diske kaydetmek yerine tamamen
    # RAM (bellek) üzerinde çalışan boş bir bayt tampon alanı (buffer) açar.
    pil_img.save(img_byte_arr, format='JPEG') #Çizim yapılan veya işlenen resim nesnesini (pil_img), diske yazmak yerine
    # doğrudan RAM'deki bu sanal dosyaya JPEG formatında bayt dizisi (0 ve 1'ler) olarak kaydeder.
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/jpeg")  #StreamingResponse() kullanıcıya görsel veri döndürmek için kullanılır


@router.post("/url")
def predict_from_url(image_url: str, conf: float = 0.25):
    try:
        # 1. API sunucun internete bağlanıp resmi URL'den indirir
        response = requests.get(image_url, timeout=5)
        response.raise_for_status()  # Link kırık mı kontrol eder

        # 2. İnen veriyi resme çevirir
        image = Image.open(BytesIO(response.content)) #response.content: İnternetten inen ham bayt (0 ve 1) dizisidir. Bu henüz işlenebilir bir görsel nesnesi değildir.
        #Amaç: RAM'deki ham veriyi okumak.
        #Ne Oluyor?: İnternetten inen response.content sadece karmaşık bir bayt (010101...) yığınıdır. Image.open() fonksiyonu ise "bana okunabilir bir dosya ver" der.
        #Burada BytesIO(response.content) diyerek o bayt verisini sanal bir dosyaya dönüştürüp Image.open'a okutuyorsun.
        results = model.predict(source=image, conf=conf)
        #buradaki image dosya nesnesi ama çıktılar numpy matrisi formatında
        # 4. Sonuçları çizdirip hazırlarsın (Aynen senin koddaki gibi)
        annotated_frame = results[0].plot()
        annotated_frame_rgb = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(annotated_frame_rgb)  #numpy matrisi olan annotated_frame_rgb resim nesnesine dönüştürür işte matris hala vardır ama
        #formati genişliği gibi bilgiler de gelir

        img_byte_arr = BytesIO()
        pil_img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        return StreamingResponse(img_byte_arr, media_type="image/jpeg")

    except Exception as e:
        return {"hata": f"Resim URL'den indirilemedi: {str(e)}"}

