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

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",

        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ],

    allow_credentials=True,

    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],

    allow_headers=[
        "Content-Type",
        "Authorization",
    ],
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