import pytest


def test_root_endpoint(client):
    """Test GET / returns API status and metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "name" in data


def test_health_endpoint(client):
    """Test GET /api/health returns status ok and model_loaded=True."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True


def test_overview_endpoint(client):
    """Test GET /api/overview returns engine dashboard summary metrics."""
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert "fraud_alerts" in data
    assert "fraud_rate" in data
    assert "avg_latency_ms" in data


def test_metrics_endpoint(client):
    """Test GET /api/metrics calculates precision, recall, F1, and ROC-AUC metrics."""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data
    assert "precision" in data
    assert "recall" in data
    assert "f1_score" in data
    assert "roc_auc" in data

    # Test dynamic threshold query parameter
    custom_res = client.get("/api/metrics?threshold=0.85")
    assert custom_res.status_code == 200
    custom_data = custom_res.json()
    assert custom_data["threshold"] == 0.85


def test_predict_endpoint(client):
    """Test POST /api/predict returns single transaction fraud prediction."""
    payload = {
        "transaction_id": "API-TEST-999",
        "account_id": "ACC-API-88",
        "amount": 499.50,
        "merchant_category": "electronics",
        "country": "US",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "fraud_probability" in data
    assert "risk_level" in data
    assert "decision" in data
    assert "latency_ms" in data


def test_stream_next_endpoint(client):
    """Test GET /api/stream/next streams next transaction using generator pipeline."""
    response = client.get("/api/stream/next")
    assert response.status_code == 200
    data = response.json()
    assert "transaction" in data
    assert "stream_sequence" in data
    assert "latency_ms" in data
    assert "risk_level" in data
    assert "decision" in data


def test_thresholds_endpoints(client):
    """Test GET /api/thresholds and POST /api/thresholds dynamic threshold tuning."""
    # GET thresholds
    get_res = client.get("/api/thresholds")
    assert get_res.status_code == 200
    thresholds = get_res.json()
    assert "fraud_threshold" in thresholds
    assert "review_threshold" in thresholds

    # POST update thresholds
    update_payload = {"fraud_threshold": 0.88, "review_threshold": 0.45}
    post_res = client.post("/api/thresholds", json=update_payload)
    assert post_res.status_code == 200
    updated = post_res.json()
    assert updated["thresholds"]["fraud_threshold"] == 0.88
    assert updated["thresholds"]["review_threshold"] == 0.45

    # Revert back to default
    client.post("/api/thresholds", json={"fraud_threshold": 0.85, "review_threshold": 0.50})


def test_high_risk_accounts_endpoint(client):
    """Test GET /api/accounts/high-risk returns flagged high risk customer accounts."""
    client.get("/api/stream/next")
    response = client.get("/api/accounts/high-risk")
    assert response.status_code == 200
    data = response.json()
    assert "high_risk_accounts" in data
    assert "total_flagged" in data


def test_customers_endpoint(client):
    """Test GET /api/customers returns customer account profiles list."""
    client.get("/api/stream/next")
    response = client.get("/api/customers")
    assert response.status_code == 200
    data = response.json()
    assert "customers" in data
    assert "total" in data


def test_training_data_stats_endpoint(client):
    """Test GET /api/training-data/stats returns total records and dataset columns."""
    response = client.get("/api/training-data/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_records" in data
    assert data["total_records"] == 100000
    assert "columns" in data


def test_stream_reset_endpoint(client):
    """Test POST /api/stream/reset resets pseudo-stream counters."""
    response = client.post("/api/stream/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset"
