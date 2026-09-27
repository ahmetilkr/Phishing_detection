from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# api/ klasöründeki hazırladığımız router'ları içe aktarıyoruz
from API.predictions import router as predictions_router
from API.reports import router as reports_router
from API.scan import router as scans_router

# 1. FastAPI Uygulamasını Başlatma
app = FastAPI(
    title="Phishing & Logo Detection API",
    description="YOLOv11 Logo Tespit ve Tehdit İstihbaratı Servisi",
    version="1.0.0",
)

# 2. CORS Middleware Ayarları (React / Frontend Erişimi İçin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında tüm kökenlere izin verir
    allow_credentials=True,
    allow_methods=["*"],  # Tüm HTTP metodlarına (GET, POST vb.) izin verir
    allow_headers=["*"],
)

# 3. Hazırladığımız Router'ları Uygulamaya Bağlama (Include)
app.include_router(predictions_router)
app.include_router(scans_router)
app.include_router(reports_router)


# 4. Kök (Root) Sağlık Kontrolü Endpoint'i
@app.get("/")
async def root():
    return {
        "status": "success",
        "message": "Phishing & Logo Detection API sorunsuz çalışıyor.",
        "docs": "/docs",
    }





