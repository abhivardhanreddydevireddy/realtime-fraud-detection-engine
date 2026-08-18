import pytest
import time


def test_single_prediction_latency_under_50ms(service):
    """Test that predicting a single transaction takes < 50ms latency as per SLA requirement."""
    test_transaction = {
        "transaction_id": "LATENCY-TEST-001",
        "account_id": "ACC-LATENCY-01",
        "amount": 149.99,
        "timestamp": "2024-01-01T12:00:00Z",
        "merchant_category": "shopping",
        "country": "US",
    }

    start = time.perf_counter()
    result = service.predict(test_transaction)
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    # Assert real-time latency is well within 50ms limit
    assert "latency_ms" in result
    assert result["latency_ms"] < 50.0, f"Latency exceeded SLA limit: {result['latency_ms']} ms"
    assert elapsed_ms < 50.0, f"Wall-clock latency exceeded 50ms: {elapsed_ms} ms"


def test_latency_statistics_calculation(service):
    """Test latency metrics aggregation (P50, P95, P99, min, max, avg, SLA compliance)."""
    service.latency_history = []

    # Simulate 100 recorded latencies: mostly fast (< 10ms), a few slower (< 30ms)
    simulated_latencies = [3.5, 4.2, 5.1, 6.0, 12.5, 8.3, 2.1, 45.0, 7.8, 15.2] * 10
    for lat in simulated_latencies:
        service._record_latency(lat)

    stats = service.get_latency_statistics()

    assert stats["avg_latency_ms"] > 0.0
    assert stats["min_latency_ms"] == 2.1
    assert stats["max_latency_ms"] == 45.0
    assert stats["p50_latency_ms"] > 0.0
    assert stats["p95_latency_ms"] > 0.0
    assert stats["p99_latency_ms"] > 0.0
    assert stats["latency_limit_ms"] == 50.0
    assert stats["sla_compliance_percent"] == 100.0
    assert stats["sla_violations"] == 0
