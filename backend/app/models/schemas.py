from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool

class TransactionInput(BaseModel):
    transaction_id: str | int | None = None
    account_id: str | int | None = None
    timestamp: datetime | None = None
    amount: float = Field(gt=0)
    merchant_category: str
    country: str
    distance_from_home_km: float | None = None
    transactions_last_1h: int | None = None
    transactions_last_24h: int | None = None
    avg_amount_7d: float | None = None
    card_age_days: int | None = None
    account_age_days: int | None = None
    device_risk_score: float | None = None
    merchant_risk_score: float | None = None
    failed_attempts_24h: int | None = None
    previous_fraud_count: int | None = None
    international: int | bool | None = None
    card_present: int | bool | None = None
    is_new_device: int | bool | None = None
    is_weekend: int | bool | None = None
    is_night: int | bool | None = None

class PredictionResponse(BaseModel):
    transaction_id: str
    account_id: str
    fraud_probability: float
    risk_level: str
    decision: str
    latency_ms: float
    reasons: list[str]
    model_version: str

class CustomerProfile(BaseModel):
    account_id: str
    transaction_count: int
    average_amount: float
    fraud_history: int
    new_device_count: int
    international_count: int
    typical_categories: list[str]
    recent_transactions: list[dict[str, Any]]
