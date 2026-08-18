from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "FraudGuard API"
    environment: str = "development"
    database_url: str | None = None
    frontend_origin: str = "http://localhost:5173"
    model_path: str = "models/final_fraud_model.pkl"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
