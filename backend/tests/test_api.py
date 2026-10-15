import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, engine, SessionLocal
import models

@pytest.fixture(scope="session")
def client():
    # Setup test tables
    models.Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

class TestApiEndpoints:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "cached_stocks_count" in data
        assert "data_provider" in data

    def test_invalid_ticker_returns_404(self, client):
        response = client.get("/api/stocks/INVALIDTICKER12345.NS")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_watchlist_lifecycle(self, client):
        # 1. Create watchlist
        res = client.post("/api/watchlists", json={"name": "Energy Leaders", "description": "Top energy names"})
        assert res.status_code == 201
        wl = res.json()
        wl_id = wl["id"]
        assert wl["name"] == "Energy Leaders"

        # 2. Add ticker
        res_add = client.post(f"/api/watchlists/{wl_id}/items", json={"symbol": "RELIANCE.NS"})
        assert res_add.status_code == 201
        items = res_add.json()["items"]
        assert any(it["symbol"] == "RELIANCE.NS" for it in items)

        # 3. Add duplicate should fail
        res_dup = client.post(f"/api/watchlists/{wl_id}/items", json={"symbol": "RELIANCE.NS"})
        assert res_dup.status_code == 400

        # 4. Remove ticker
        res_del_item = client.delete(f"/api/watchlists/{wl_id}/items/RELIANCE.NS")
        assert res_del_item.status_code == 204

        # 5. Patch name
        res_patch = client.patch(f"/api/watchlists/{wl_id}", json={"name": "Energy & Power"})
        assert res_patch.status_code == 200
        assert res_patch.json()["name"] == "Energy & Power"

        # 6. Delete watchlist
        res_del = client.delete(f"/api/watchlists/{wl_id}")
        assert res_del.status_code == 204

        # 7. Check 404 after delete
        res_check = client.get(f"/api/watchlists/{wl_id}")
        assert res_check.status_code == 404

    def test_alert_lifecycle_and_evaluation(self, client):
        # 1. Create alert rule
        rule_data = {
            "symbol": "TCS.NS",
            "rule_type": "PRICE_CHANGE_PCT_ABOVE",
            "threshold": 1.0,
            "is_active": True
        }
        res = client.post("/api/alerts", json=rule_data)
        assert res.status_code == 201
        alert = res.json()
        alert_id = alert["id"]
        assert alert["symbol"] == "TCS.NS"

        # 2. List alerts
        res_list = client.get("/api/alerts")
        assert res_list.status_code == 200
        assert any(a["id"] == alert_id for a in res_list.json())

        # 3. Evaluate alerts
        res_eval = client.post("/api/alerts/evaluate")
        assert res_eval.status_code == 200
        eval_data = res_eval.json()
        assert "evaluated_rules_count" in eval_data
        assert eval_data["evaluated_rules_count"] >= 1

        # 4. Get notifications
        res_notif = client.get("/api/alerts/notifications")
        assert res_notif.status_code == 200
        assert isinstance(res_notif.json(), list)

        # 5. Clean up
        res_del = client.delete(f"/api/alerts/{alert_id}")
        assert res_del.status_code == 204
