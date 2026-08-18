from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.config import settings
from .services.ml_service import ml_service


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Real-time behavioral credit-card "
        "fraud detection API."
    ),
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



# =========================================================
# ROUTES
# =========================================================

app.include_router(router)


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup():
    ml_service.load()


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "name": "FraudGuard API",
        "status": "running",
        "docs": "/docs",
    }