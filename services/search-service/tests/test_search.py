import os
import sys
from fastapi.testclient import TestClient

# Add project root to sys path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/actuator/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}

def test_search_endpoint():
    response = client.get("/search?q=test")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert "facets" in data

def test_autocomplete_endpoint():
    response = client.get("/search/autocomplete?q=el")
    assert response.status_code == 200
    suggestions = response.json()
    assert isinstance(suggestions, list)
