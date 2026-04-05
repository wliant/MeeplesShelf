"""E2e tests for pagination — Gap 5.

These tests require a running MeeplesShelf stack
(docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up).

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
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def three_games(client: httpx.Client, admin_headers: dict):
    """Create three games for pagination tests."""
    games = []
    for name in ["E2E Pag Alpha", "E2E Pag Beta", "E2E Pag Gamma"]:
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name, "min_players": 2, "max_players": 4},
        )
        assert resp.status_code == 201
        games.append(resp.json())

    yield games

    for g in games:
        client.delete(f"/games/{g['id']}", headers=admin_headers)


@pytest.fixture()
def player_for_pag(client: httpx.Client, admin_headers: dict):
    """Ensure a player exists for session creation."""
    name = "E2E_Pag_Player"
    resp = client.post("/players", headers=admin_headers, json={"name": name})
    if resp.status_code == 201:
        return resp.json()
    # Already exists
    all_resp = client.get("/players")
    return next(p for p in all_resp.json() if p["name"] == name)


@pytest.fixture()
def sessions_for_pag(
    client: httpx.Client,
    admin_headers: dict,
    three_games: list,
    player_for_pag: dict,
):
    """Create sessions across games for pagination tests."""
    sessions = []
    for i, game in enumerate(three_games):
        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "played_at": f"2025-0{i + 1}-15T12:00:00",
                "players": [{"player_id": player_for_pag["id"], "score_data": {}}],
            },
        )
        assert resp.status_code == 201
        sessions.append(resp.json())

    yield sessions
    # Cleanup happens via three_games fixture (cascade delete)


class TestGamesPagination:
    def test_default_pagination_shape(self, client: httpx.Client, three_games: list):
        resp = client.get("/games")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert data["skip"] == 0
        assert data["limit"] == 20
        assert isinstance(data["items"], list)
        assert data["total"] >= 3

    def test_explicit_skip_limit(self, client: httpx.Client, three_games: list):
        resp = client.get("/games", params={"skip": 0, "limit": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["skip"] == 0
        assert data["limit"] == 2
        assert data["total"] >= 3

    def test_skip_returns_different_items(self, client: httpx.Client, three_games: list):
        resp1 = client.get("/games", params={"skip": 0, "limit": 2})
        resp2 = client.get("/games", params={"skip": 2, "limit": 2})
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        ids1 = {g["id"] for g in resp1.json()["items"]}
        ids2 = {g["id"] for g in resp2.json()["items"]}
        assert ids1.isdisjoint(ids2)

    def test_pagination_with_name_filter(self, client: httpx.Client, three_games: list):
        resp = client.get(
            "/games", params={"name": "E2E Pag", "skip": 0, "limit": 1}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["total"] == 3  # 3 games match the filter

    def test_skip_beyond_total(self, client: httpx.Client, three_games: list):
        resp = client.get("/games", params={"skip": 10000, "limit": 20})
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] >= 3

    def test_limit_exceeds_max_rejected(self, client: httpx.Client):
        resp = client.get("/games", params={"limit": 200})
        assert resp.status_code == 422

    def test_negative_skip_rejected(self, client: httpx.Client):
        resp = client.get("/games", params={"skip": -1})
        assert resp.status_code == 422

    def test_zero_limit_rejected(self, client: httpx.Client):
        resp = client.get("/games", params={"limit": 0})
        assert resp.status_code == 422


class TestSessionsPagination:
    def test_default_pagination_shape(
        self, client: httpx.Client, sessions_for_pag: list
    ):
        resp = client.get("/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["skip"] == 0
        assert data["limit"] == 20
        assert data["total"] >= 3

    def test_explicit_skip_limit(
        self, client: httpx.Client, sessions_for_pag: list
    ):
        resp = client.get("/sessions", params={"skip": 0, "limit": 1})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["total"] >= 3

    def test_pagination_with_game_filter(
        self,
        client: httpx.Client,
        three_games: list,
        sessions_for_pag: list,
    ):
        game_a = three_games[0]
        resp = client.get(
            "/sessions",
            params={"game_id": game_a["id"], "skip": 0, "limit": 10},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["game_id"] == game_a["id"]

    def test_sessions_limit_exceeds_max_rejected(self, client: httpx.Client):
        resp = client.get("/sessions", params={"limit": 200})
        assert resp.status_code == 422

    def test_sessions_negative_skip_rejected(self, client: httpx.Client):
        resp = client.get("/sessions", params={"skip": -1})
        assert resp.status_code == 422
