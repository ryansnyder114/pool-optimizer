import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

def test_sample_match_endpoint():
    response = client.get("/sample-match")
    assert response.status_code == 200
    data = response.json()
    assert "our_team" in data
    assert "opp_team" in data

def test_legal_players_endpoint():
    sample = client.get("/sample-match").json()
    response = client.post("/legal-players", json=sample)
    assert response.status_code == 200
    data = response.json()
    assert "our_legal_players" in data
    assert "opp_legal_players" in data
    assert len(data["our_legal_players"]) > 0

def test_best_first_declaration_endpoint():
    sample = client.get("/sample-match").json()
    response = client.post("/best-first-declaration", json=sample)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    # Check structure
    rec = data["recommendations"][0]
    assert "player" in rec
    assert "value" in rec

def test_best_response_endpoint():
    sample = client.get("/sample-match").json()
    body = {
        "state": sample,
        "opp_player_id": "o1"
    }
    response = client.post("/best-response", json=body)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

def test_best_response_invalid_player():
    sample = client.get("/sample-match").json()
    body = {
        "state": sample,
        "opp_player_id": "invalid_id"
    }
    response = client.post("/best-response", json=body)
    # Should return error or empty
    data = response.json()
    assert "error" in data or len(data.get("recommendations", [])) == 0
