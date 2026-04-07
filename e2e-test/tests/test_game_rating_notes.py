"""E2e tests for game ratings and personal notes — Gap 8.

These tests require a running MeeplesShelf stack
(docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up).

Configuration is loaded from the project root .env file.
Override via environment variables:
    E2E_BASE_URL   (default: http://localhost:{APP_PORT}/api)
    APP_ADMIN_PASSWORD
"""

import os
from pathlib import Path

import httpx
import pytest
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)

_app_port = os.environ.get("APP_PORT", "8000")
BASE_URL = os.environ.get("E2E_BASE_URL", f"http://localhost:{_app_port}/api")
ADMIN_PASS = os.environ.get("APP_ADMIN_PASSWORD", "changeme")


@pytest.fixture()
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


@pytest.fixture()
def admin_headers(client: httpx.Client):
    resp = client.post("/auth/token", json={"password": ADMIN_PASS})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def rated_game(client: httpx.Client, admin_headers: dict):
    """Create a game with rating and notes for testing."""
    resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Rated Game",
            "min_players": 2,
            "max_players": 4,
            "rating": 8,
            "notes": "Great for game night",
        },
    )
    assert resp.status_code == 201
    game = resp.json()
    yield game
    client.delete(f"/games/{game['id']}", headers=admin_headers)


class TestCreateWithRating:
    def test_create_game_with_rating_and_notes(self, client, admin_headers, rated_game):
        assert rated_game["rating"] == 8
        assert rated_game["notes"] == "Great for game night"

    def test_create_game_without_rating(self, client, admin_headers):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E No Rating Game", "min_players": 1, "max_players": 4},
        )
        assert resp.status_code == 201
        game = resp.json()
        assert game["rating"] is None
        assert game["notes"] is None
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_create_game_rating_out_of_range_high(self, client, admin_headers):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Bad Rating", "rating": 11},
        )
        assert resp.status_code == 422

    def test_create_game_rating_out_of_range_zero(self, client, admin_headers):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Zero Rating", "rating": 0},
        )
        assert resp.status_code == 422


class TestUpdateRating:
    def test_update_rating(self, client, admin_headers, rated_game):
        resp = client.put(
            f"/games/{rated_game['id']}",
            headers=admin_headers,
            json={"rating": 5},
        )
        assert resp.status_code == 200
        assert resp.json()["rating"] == 5

    def test_update_notes(self, client, admin_headers, rated_game):
        resp = client.put(
            f"/games/{rated_game['id']}",
            headers=admin_headers,
            json={"notes": "Updated notes"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Updated notes"

    def test_clear_rating(self, client, admin_headers, rated_game):
        resp = client.put(
            f"/games/{rated_game['id']}",
            headers=admin_headers,
            json={"rating": None},
        )
        assert resp.status_code == 200
        assert resp.json()["rating"] is None

    def test_update_rating_invalid(self, client, admin_headers, rated_game):
        resp = client.put(
            f"/games/{rated_game['id']}",
            headers=admin_headers,
            json={"rating": 15},
        )
        assert resp.status_code == 422


class TestGetGameWithRating:
    def test_get_returns_rating_and_notes(self, client, rated_game):
        resp = client.get(f"/games/{rated_game['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rating"] == 8
        assert data["notes"] == "Great for game night"

    def test_list_returns_rating_and_notes(self, client, rated_game):
        resp = client.get("/games", params={"name": "E2E Rated Game"})
        assert resp.status_code == 200
        items = resp.json()["items"]
        match = [g for g in items if g["id"] == rated_game["id"]]
        assert len(match) == 1
        assert match[0]["rating"] == 8
        assert match[0]["notes"] == "Great for game night"
