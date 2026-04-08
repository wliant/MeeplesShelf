"""E2e regression tests for accessibility improvements — Gap 20.

These tests verify that API endpoints continue to work correctly after
the frontend accessibility changes (aria-labels, tooltips, skip link,
nav landmarks, focus indicators).

Configuration is loaded from the project root .env file.
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
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_game(client: httpx.Client, admin_headers: dict):
    """Create a temporary game for testing, clean up after."""
    game_data = {
        "name": "A11y Test Game",
        "min_players": 2,
        "max_players": 4,
        "scoring_spec": {
            "fields": [
                {"id": "points", "label": "Points", "type": "numeric", "multiplier": 1}
            ],
            "highest_wins": True,
        },
    }
    resp = client.post("/games", json=game_data, headers=admin_headers)
    assert resp.status_code in (200, 201)
    game = resp.json()
    yield game
    client.delete(f"/games/{game['id']}", headers=admin_headers)


class TestAccessibilityRegression:
    """Verify API endpoints still respond correctly after frontend a11y changes."""

    def test_games_list(self, client: httpx.Client):
        """GET /api/games returns paginated games."""
        resp = client.get("/games")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body

    def test_sessions_list(self, client: httpx.Client):
        """GET /api/sessions returns paginated sessions."""
        resp = client.get("/sessions")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body

    def test_players_list(self, client: httpx.Client):
        """GET /api/players returns player list."""
        resp = client.get("/players")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)

    def test_stats_overview(self, client: httpx.Client):
        """GET /api/stats/overview returns stats."""
        resp = client.get("/stats/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert "total_games" in body
        assert "total_sessions" in body

    def test_game_crud_still_works(
        self, client: httpx.Client, admin_headers: dict, test_game: dict
    ):
        """Create, read, update, delete cycle works after frontend changes."""
        game_id = test_game["id"]

        # Read
        resp = client.get(f"/games/{game_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "A11y Test Game"

        # Update
        resp = client.put(
            f"/games/{game_id}",
            json={
                "name": "A11y Test Game Updated",
                "min_players": 2,
                "max_players": 4,
                "scoring_spec": test_game["scoring_spec"],
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "A11y Test Game Updated"

    def test_export_requires_admin(self, client: httpx.Client):
        """Export endpoint still requires admin auth."""
        resp = client.get("/export")
        assert resp.status_code in (401, 403)

    def test_auth_flow(self, client: httpx.Client):
        """Auth endpoint still works."""
        resp = client.post("/auth/token", json={"password": ADMIN_PASS})
        assert resp.status_code == 200
        assert "access_token" in resp.json()
