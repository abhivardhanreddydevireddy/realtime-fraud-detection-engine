import pytest


def test_generator_creation_and_yielding(service):
    """Test that python generator is created and yields valid transaction dictionaries."""
    service.reset_stream()

    # Ensure transaction_generator creates a generator instance
    generator = service.transaction_generator()
    assert generator is not None

    # Fetch first transaction from generator using next()
    tx = next(generator)

    # Verify dictionary structure produced by generator
    assert isinstance(tx, dict)
    assert "transaction_id" in tx
    assert "account_id" in tx
    assert "amount" in tx
    assert "timestamp" in tx


def test_generator_continuous_stream(service):
    """Test that generator continuously produces distinct sequential items using next()."""
    service.reset_stream()

    # Call stream_next multiple times
    tx1 = service.stream_next()
    tx2 = service.stream_next()
    tx3 = service.stream_next()

    assert tx1 is not None
    assert tx2 is not None
    assert tx3 is not None

    # Verify stream sequences increment correctly
    assert tx1["stream_sequence"] == 1
    assert tx2["stream_sequence"] == 2
    assert tx3["stream_sequence"] == 3

    # Verify transaction prediction attributes
    for tx in [tx1, tx2, tx3]:
        assert "fraud_probability" in tx
        assert "risk_level" in tx
        assert "decision" in tx
        assert "latency_ms" in tx


def test_generator_reset_stream(service):
    """Test that reset_stream clears sequence counters and resets generator state."""
    # Stream a few records
    for _ in range(5):
        service.stream_next()

    assert service.total_stream_transactions >= 5

    # Reset stream
    service.reset_stream()

    assert service.stream_index == 0
    assert service.total_stream_transactions == 0
    assert len(service.stream_transactions) == 0
    assert service.streaming_generator is None

    # Verify next stream starts at sequence 1
    first_after_reset = service.stream_next()
    assert first_after_reset["stream_sequence"] == 1
