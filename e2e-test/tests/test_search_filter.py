"""E2e tests for search and filtering — Gap 4.

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
def two_games(client: httpx.Client, admin_headers: dict):
    """Create two games with distinct names."""
    games = []
    for name in ["E2E Filter Alpha", "E2E Filter Beta"]:
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
def two_players(client: httpx.Client, admin_headers: dict):
    """Ensure two unique players exist and return them."""
    players = []
    for name in ["E2E_Filter_Player_X", "E2E_Filter_Player_Y"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 201:
            players.append(resp.json())
        elif resp.status_code == 409:
            all_resp = client.get("/players")
            player = next(p for p in all_resp.json() if p["name"] == name)
            players.append(player)
        else:
            pytest.fail(f"Failed to create player {name}: {resp.text}")
    return players


@pytest.fixture()
def sessions_for_filter(
    client: httpx.Client,
    admin_headers: dict,
    two_games: list,
    two_players: list,
):
    """Create sessions across two games, two players, and different dates."""
    game_a, game_b = two_games
    px, py = two_players
    sessions = []

    # Session 1: game_a, player_x only, 2025-01-15
    resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game_a["id"],
            "played_at": "2025-01-15T12:00:00",
            "players": [{"player_id": px["id"], "score_data": {}}],
        },
    )
    assert resp.status_code == 201
    sessions.append(resp.json())

    # Session 2: game_b, both players, 2025-03-20
    resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game_b["id"],
            "played_at": "2025-03-20T18:00:00",
            "players": [
                {"player_id": px["id"], "score_data": {}},
                {"player_id": py["id"], "score_data": {}},
            ],
        },
    )
    assert resp.status_code == 201
    sessions.append(resp.json())

    # Session 3: game_a, player_y only, 2025-06-10
    resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game_a["id"],
            "played_at": "2025-06-10T20:00:00",
            "players": [{"player_id": py["id"], "score_data": {}}],
        },
    )
    assert resp.status_code == 201
    sessions.append(resp.json())

    yield sessions
    # Cleanup happens via two_games fixture (cascade delete)


class TestGameSearch:
    def test_no_filter_returns_all(self, client: httpx.Client, two_games: list):
        resp = client.get("/games")
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" in names

    def test_filter_by_exact_name(self, client: httpx.Client, two_games: list):
        resp = client.get("/games", params={"name": "E2E Filter Alpha"})
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" not in names

    def test_filter_by_substring_case_insensitive(
        self, client: httpx.Client, two_games: list
    ):
        resp = client.get("/games", params={"name": "filter alpha"})
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" not in names

    def test_filter_no_match(self, client: httpx.Client, two_games: list):
        resp = client.get("/games", params={"name": "NonexistentXYZ123"})
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_filter_empty_string_returns_all(
        self, client: httpx.Client, two_games: list
    ):
        resp = client.get("/games", params={"name": ""})
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" in names


class TestSessionFilter:
    def test_filter_by_game_id(
        self,
        client: httpx.Client,
        two_games: list,
        sessions_for_filter: list,
    ):
        game_a = two_games[0]
        resp = client.get("/sessions", params={"game_id": game_a["id"]})
        assert resp.status_code == 200
        data = resp.json()["items"]
        assert all(s["game_id"] == game_a["id"] for s in data)
        assert len(data) == 2  # sessions 1 and 3

    def test_filter_by_player_id(
        self,
        client: httpx.Client,
        two_players: list,
        sessions_for_filter: list,
    ):
        py = two_players[1]  # Player Y is in sessions 2 and 3
        resp = client.get("/sessions", params={"player_id": py["id"]})
        assert resp.status_code == 200
        data = resp.json()["items"]
        assert len(data) == 2
        for s in data:
            player_ids = [p["player_id"] for p in s["players"]]
            assert py["id"] in player_ids

    def test_filter_by_date_from(
        self,
        client: httpx.Client,
        sessions_for_filter: list,
    ):
        resp = client.get("/sessions", params={"date_from": "2025-03-01"})
        assert resp.status_code == 200
        data = resp.json()["items"]
        # Sessions 2 (March 20) and 3 (June 10) match
        session_ids = {s["id"] for s in data}
        assert sessions_for_filter[1]["id"] in session_ids
        assert sessions_for_filter[2]["id"] in session_ids
        assert sessions_for_filter[0]["id"] not in session_ids

    def test_filter_by_date_to(
        self,
        client: httpx.Client,
        sessions_for_filter: list,
    ):
        resp = client.get("/sessions", params={"date_to": "2025-03-20"})
        assert resp.status_code == 200
        data = resp.json()["items"]
        session_ids = {s["id"] for s in data}
        # Sessions 1 (Jan 15) and 2 (March 20) match
        assert sessions_for_filter[0]["id"] in session_ids
        assert sessions_for_filter[1]["id"] in session_ids
        assert sessions_for_filter[2]["id"] not in session_ids

    def test_filter_by_date_range(
        self,
        client: httpx.Client,
        sessions_for_filter: list,
    ):
        resp = client.get(
            "/sessions",
            params={"date_from": "2025-02-01", "date_to": "2025-05-01"},
        )
        assert resp.status_code == 200
        data = resp.json()["items"]
        # Only session 2 (March 20) is in range
        assert len(data) >= 1
        session_ids = {s["id"] for s in data}
        assert sessions_for_filter[1]["id"] in session_ids
        assert sessions_for_filter[0]["id"] not in session_ids
        assert sessions_for_filter[2]["id"] not in session_ids

    def test_filter_combined(
        self,
        client: httpx.Client,
        two_games: list,
        two_players: list,
        sessions_for_filter: list,
    ):
        game_a = two_games[0]
        py = two_players[1]
        # game_a + player_y => only session 3
        resp = client.get(
            "/sessions",
            params={"game_id": game_a["id"], "player_id": py["id"]},
        )
        assert resp.status_code == 200
        data = resp.json()["items"]
        assert len(data) == 1
        assert data[0]["id"] == sessions_for_filter[2]["id"]

    def test_filter_no_match(
        self,
        client: httpx.Client,
        sessions_for_filter: list,
    ):
        resp = client.get(
            "/sessions",
            params={"date_from": "2030-01-01", "date_to": "2030-12-31"},
        )
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_filter_player_id_nonexistent(self, client: httpx.Client):
        resp = client.get("/sessions", params={"player_id": 999999})
        assert resp.status_code == 200
        assert resp.json()["items"] == []
