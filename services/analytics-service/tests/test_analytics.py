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

def test_sales_analytics():
    response = client.get("/analytics/sales")
    assert response.status_code == 200
    data = response.json()
    assert "totalSales" in data
    assert "transactionsCount" in data

def test_funnel_analytics():
    response = client.get("/analytics/funnel")
    assert response.status_code == 200
    data = response.json()
    assert "checkoutInitiated" in data
    assert "checkoutToOrderRate" in data
