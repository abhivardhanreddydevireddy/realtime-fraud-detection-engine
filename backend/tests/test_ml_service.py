import pytest


def test_model_loaded_and_dataset_ready(service):
    """Test that ML model pipeline is loaded and evaluation dataset is populated."""
    assert service.model_loaded is True
    assert service.model is not None
    assert service.training_data is not None
    assert not service.training_data.empty
    assert len(service.training_data) > 0


def test_prediction_output_contract(service):
    """Test that predict() returns all required ML prediction fields."""
    sample_tx = {
        "transaction_id": "TEST-CONTRACT-100",
        "account_id": "ACC-TEST-999",
        "amount": 250.00,
        "merchant_category": "retail",
        "country": "US",
        "timestamp": "2024-01-01T15:30:00Z",
    }

    result = service.predict(sample_tx)

    # Required contract fields: fraud_probability, risk_level, decision, latency_ms, reasons, model_version
    assert "fraud_probability" in result
    assert isinstance(result["fraud_probability"], float)
    assert 0.0 <= result["fraud_probability"] <= 1.0

    assert "risk_level" in result
    assert result["risk_level"] in ["HIGH", "MEDIUM", "LOW"]

    assert "decision" in result
    assert result["decision"] in ["FRAUD ALERT", "REVIEW", "APPROVE"]

    assert "latency_ms" in result
    assert "reasons" in result
    assert isinstance(result["reasons"], list)

    assert "model_version" in result


def test_threshold_tuning_configuration(service):
    """Test that default threshold constants exist and can be dynamically updated."""
    assert hasattr(service, "FRAUD_THRESHOLD")
    assert hasattr(service, "REVIEW_THRESHOLD")

    res = service.update_thresholds(0.90, 0.40)
    assert res["status"] == "updated"
    assert service.FRAUD_THRESHOLD == 0.90
    assert service.REVIEW_THRESHOLD == 0.40

    # Reset back to default
    service.update_thresholds(0.9229, 0.50)


def test_high_risk_account_flagging(service):
    """Test identification and aggregation of high-risk customer accounts."""
    service.reset_stream()

    # Stream several transactions to generate activity
    for _ in range(15):
        service.stream_next()

    risk_report = service.get_high_risk_accounts(min_fraud_alerts=0)
    assert "high_risk_accounts" in risk_report
    assert "total_flagged" in risk_report
    assert isinstance(risk_report["high_risk_accounts"], list)


def test_overview_analytics_generation(service):
    """Test overview analytics calculation."""
    overview = service.get_overview()

    assert isinstance(overview, dict)
    assert "transactions" in overview
    assert "fraud_alerts" in overview
    assert "fraud_rate" in overview
    assert "avg_latency_ms" in overview
    assert "stream_status" in overview
