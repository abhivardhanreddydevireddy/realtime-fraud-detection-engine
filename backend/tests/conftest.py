import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend folder is in Python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services.ml_service import ml_service


@pytest.fixture(scope="session", autouse=True)
def initialize_ml_service():
    """Ensure ML service is loaded before running tests."""
    ml_service.load()
    yield ml_service


@pytest.fixture
def client():
    """Provide a FastAPI TestClient for HTTP route testing."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def service():
    """Provide direct access to the loaded ml_service instance."""
    return ml_service
