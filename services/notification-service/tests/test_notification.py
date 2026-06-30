import os
import sys
from fastapi.testclient import TestClient

# Add project root to sys path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set environment variables for testing
os.environ["SPRING_DATASOURCE_URL"] = "sqlite:///:memory:"

from src.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/actuator/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}

def test_update_preferences():
    pref_payload = {
        "user_id": "user_abc",
        "event_type": "user.registered",
        "email_enabled": True,
        "sms_enabled": False,
        "push_enabled": True
    }
    response = client.post("/notifications/preferences", json=pref_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "SUCCESS"

    # Fetch preferences
    response_get = client.get("/notifications/preferences/user_abc")
    assert response_get.status_code == 200
    prefs = response_get.json()
    assert len(prefs) > 0
    assert prefs[0]["email_enabled"] is True
    assert prefs[0]["sms_enabled"] is False
