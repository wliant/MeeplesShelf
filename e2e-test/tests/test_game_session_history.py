"""E2e tests for game card session history — Gap 23.

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
def game_no_sessions(client: httpx.Client, admin_headers: dict):
    """Create a game with no sessions."""
    resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E No Sessions Game",
            "min_players": 2,
            "max_players": 4,
            "scoring_spec": {
                "version": 1,
                "fields": [
                    {"id": "points", "label": "Points", "type": "raw_score"},
                ],
            },
        },
    )
    assert resp.status_code == 201
    game = resp.json()
    yield game
    client.delete(f"/games/{game['id']}", headers=admin_headers)


@pytest.fixture()
def players(client: httpx.Client, admin_headers: dict):
    """Create test players."""
    created = []
    for name in ["HistAlice", "HistBob"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 409:
            all_players = client.get("/players").json()
            player = next(p for p in all_players if p["name"] == name)
        else:
            assert resp.status_code == 201
            player = resp.json()
        created.append(player)
    yield created
    for p in created:
        client.delete(f"/players/{p['id']}", headers=admin_headers)


@pytest.fixture()
def game_with_sessions(client: httpx.Client, admin_headers: dict, players: list):
    """Create a game with 3 sessions at known dates."""
    resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Session History Game",
            "min_players": 2,
            "max_players": 4,
            "scoring_spec": {
                "version": 1,
                "fields": [
                    {"id": "points", "label": "Points", "type": "raw_score"},
                ],
            },
        },
    )
    assert resp.status_code == 201
    game = resp.json()

    sessions = []
    dates = [
        "2025-03-01T14:00:00",
        "2025-04-15T18:00:00",
        "2025-06-20T10:00:00",
    ]
    for played_at in dates:
        s = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "played_at": played_at,
                "players": [
                    {"player_id": players[0]["id"], "score_data": {"points": 50}},
                    {"player_id": players[1]["id"], "score_data": {"points": 30}},
                ],
            },
        )
        assert s.status_code == 201
        sessions.append(s.json())

    yield {"game": game, "sessions": sessions}
    client.delete(f"/games/{game['id']}", headers=admin_headers)


class TestGameListSessionHistory:
    def test_game_with_no_sessions_has_zero_count(
        self, client: httpx.Client, game_no_sessions: dict
    ):
        resp = client.get("/games", params={"name": game_no_sessions["name"]})
        assert resp.status_code == 200
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_no_sessions["id"])
        assert game["session_count"] == 0
        assert game["last_played_at"] is None

    def test_game_with_sessions_has_correct_count(
        self, client: httpx.Client, game_with_sessions: dict
    ):
        game_id = game_with_sessions["game"]["id"]
        resp = client.get(
            "/games", params={"name": game_with_sessions["game"]["name"]}
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_id)
        assert game["session_count"] == 3

    def test_game_with_sessions_has_last_played(
        self, client: httpx.Client, game_with_sessions: dict
    ):
        game_id = game_with_sessions["game"]["id"]
        resp = client.get(
            "/games", params={"name": game_with_sessions["game"]["name"]}
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_id)
        assert game["last_played_at"] is not None
        assert "2025-06-20" in game["last_played_at"]

    def test_session_count_updates_after_new_session(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_sessions: dict,
        players: list,
    ):
        game_id = game_with_sessions["game"]["id"]
        # Create a 4th session
        s = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game_id,
                "played_at": "2025-07-01T12:00:00",
                "players": [
                    {"player_id": players[0]["id"], "score_data": {"points": 40}},
                    {"player_id": players[1]["id"], "score_data": {"points": 20}},
                ],
            },
        )
        assert s.status_code == 201
        session_id = s.json()["id"]

        resp = client.get(
            "/games", params={"name": game_with_sessions["game"]["name"]}
        )
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_id)
        assert game["session_count"] == 4
        assert "2025-07-01" in game["last_played_at"]

        # Cleanup the extra session
        client.delete(f"/sessions/{session_id}", headers=admin_headers)

    def test_session_count_updates_after_delete(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_sessions: dict,
        players: list,
    ):
        game_id = game_with_sessions["game"]["id"]

        # Verify starting count
        resp = client.get(
            "/games", params={"name": game_with_sessions["game"]["name"]}
        )
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_id)
        initial_count = game["session_count"]

        # Delete the last session (2025-06-20)
        last_session = game_with_sessions["sessions"][-1]
        del_resp = client.delete(
            f"/sessions/{last_session['id']}", headers=admin_headers
        )
        assert del_resp.status_code == 204, f"Delete failed: {del_resp.text}"

        resp = client.get(
            "/games", params={"name": game_with_sessions["game"]["name"]}
        )
        items = resp.json()["items"]
        game = next(g for g in items if g["id"] == game_id)
        assert game["session_count"] == initial_count - 1
        assert "2025-04-15" in game["last_played_at"]

        # Re-create the deleted session so fixture teardown is clean
        s = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game_id,
                "played_at": "2025-06-20T10:00:00",
                "players": [
                    {"player_id": players[0]["id"], "score_data": {"points": 50}},
                    {"player_id": players[1]["id"], "score_data": {"points": 30}},
                ],
            },
        )
        assert s.status_code == 201


class TestGetGameSessionHistory:
    def test_get_game_includes_session_stats(
        self, client: httpx.Client, game_with_sessions: dict
    ):
        game_id = game_with_sessions["game"]["id"]
        resp = client.get(f"/games/{game_id}")
        assert resp.status_code == 200
        game = resp.json()
        assert game["session_count"] == 3
        assert game["last_played_at"] is not None
        assert "2025-06-20" in game["last_played_at"]

    def test_get_unplayed_game(
        self, client: httpx.Client, game_no_sessions: dict
    ):
        resp = client.get(f"/games/{game_no_sessions['id']}")
        assert resp.status_code == 200
        game = resp.json()
        assert game["session_count"] == 0
        assert game["last_played_at"] is None


class TestResponseShape:
    def test_all_games_have_session_fields(self, client: httpx.Client):
        resp = client.get("/games")
        assert resp.status_code == 200
        for game in resp.json()["items"]:
            assert "session_count" in game
            assert "last_played_at" in game
            assert isinstance(game["session_count"], int)
