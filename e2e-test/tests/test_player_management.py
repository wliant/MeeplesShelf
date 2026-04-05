"""E2e tests for player management — rename and delete (Gap 21).

These tests require a running MeeplesShelf stack
(docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up).

Configuration is loaded from the project root .env file.
Override via environment variables:
    E2E_BASE_URL   (default: http://localhost:{APP_PORT}/api)
    APP_ADMIN_PASSWORD
"""

import os
import uuid
from pathlib import Path

import httpx
import pytest
from dotenv import load_dotenv

# Load .env from project root (two levels up from this test file)
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
def player(client: httpx.Client, admin_headers: dict):
    """Create a disposable player for testing."""
    uid = uuid.uuid4().hex[:8]
    resp = client.post(
        "/players",
        headers=admin_headers,
        json={"name": f"E2E Player {uid}"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def player_with_session(client: httpx.Client, admin_headers: dict):
    """Create a player who has participated in a session."""
    uid = uuid.uuid4().hex[:8]

    # Create game
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={"name": f"E2E Player Mgmt Game {uid}", "min_players": 1, "max_players": 4},
    )
    assert game_resp.status_code == 201
    game = game_resp.json()

    # Create player
    player_resp = client.post(
        "/players",
        headers=admin_headers,
        json={"name": f"E2E Player Session {uid}"},
    )
    assert player_resp.status_code == 201
    player = player_resp.json()

    # Create session with that player
    session_resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "players": [{"player_id": player["id"], "score_data": {}}],
        },
    )
    assert session_resp.status_code == 201
    session = session_resp.json()

    yield {"player": player, "game": game, "session": session}

    # Cleanup: delete session, game, and player (ignore 404 if test already deleted)
    client.delete(f"/sessions/{session['id']}", headers=admin_headers)
    client.delete(f"/games/{game['id']}", headers=admin_headers)
    client.delete(f"/players/{player['id']}", headers=admin_headers)


class TestPlayerList:
    def test_list_players_includes_session_count(
        self, client: httpx.Client, admin_headers: dict, player_with_session: dict
    ):
        resp = client.get("/players")
        assert resp.status_code == 200
        players = resp.json()
        target = next(
            (p for p in players if p["id"] == player_with_session["player"]["id"]),
            None,
        )
        assert target is not None
        assert "session_count" in target
        assert target["session_count"] >= 1

    def test_list_players_zero_sessions(
        self, client: httpx.Client, admin_headers: dict, player: dict
    ):
        resp = client.get("/players")
        players = resp.json()
        target = next((p for p in players if p["id"] == player["id"]), None)
        assert target is not None
        assert target["session_count"] == 0
        # Cleanup
        client.delete(f"/players/{player['id']}", headers=admin_headers)


class TestPlayerRename:
    def test_rename_player(
        self, client: httpx.Client, admin_headers: dict, player: dict
    ):
        new_name = f"E2E Renamed {uuid.uuid4().hex[:8]}"
        resp = client.put(
            f"/players/{player['id']}",
            headers=admin_headers,
            json={"name": new_name},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == new_name
        # Cleanup
        client.delete(f"/players/{player['id']}", headers=admin_headers)

    def test_rename_to_duplicate_name(
        self, client: httpx.Client, admin_headers: dict, player: dict
    ):
        # Create a second player
        uid = uuid.uuid4().hex[:8]
        resp2 = client.post(
            "/players",
            headers=admin_headers,
            json={"name": f"E2E Dup Target {uid}"},
        )
        assert resp2.status_code == 201
        player2 = resp2.json()

        # Try to rename first player to second player's name
        resp = client.put(
            f"/players/{player['id']}",
            headers=admin_headers,
            json={"name": player2["name"]},
        )
        assert resp.status_code == 409

        # Cleanup
        client.delete(f"/players/{player['id']}", headers=admin_headers)
        client.delete(f"/players/{player2['id']}", headers=admin_headers)

    def test_rename_nonexistent_player(
        self, client: httpx.Client, admin_headers: dict
    ):
        resp = client.put(
            "/players/999999",
            headers=admin_headers,
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    def test_rename_requires_admin(
        self, client: httpx.Client, player: dict, admin_headers: dict
    ):
        resp = client.put(
            f"/players/{player['id']}",
            json={"name": "Unauthorized Rename"},
        )
        assert resp.status_code == 401
        # Cleanup
        client.delete(f"/players/{player['id']}", headers=admin_headers)


class TestPlayerDelete:
    def test_delete_player(
        self, client: httpx.Client, admin_headers: dict, player: dict
    ):
        resp = client.delete(
            f"/players/{player['id']}",
            headers=admin_headers,
        )
        assert resp.status_code == 204

        # Verify player is gone
        players = client.get("/players").json()
        assert not any(p["id"] == player["id"] for p in players)

    def test_delete_player_cascades_session_players(
        self, client: httpx.Client, admin_headers: dict, player_with_session: dict
    ):
        player_id = player_with_session["player"]["id"]
        session_id = player_with_session["session"]["id"]

        # Delete the player
        resp = client.delete(f"/players/{player_id}", headers=admin_headers)
        assert resp.status_code == 204

        # Session should still exist but player should be gone from it
        session_resp = client.get(f"/sessions/{session_id}")
        assert session_resp.status_code == 200
        session = session_resp.json()
        player_ids = [p["player_id"] for p in session["players"]]
        assert player_id not in player_ids

    def test_delete_nonexistent_player(
        self, client: httpx.Client, admin_headers: dict
    ):
        resp = client.delete("/players/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_requires_admin(
        self, client: httpx.Client, player: dict, admin_headers: dict
    ):
        resp = client.delete(f"/players/{player['id']}")
        assert resp.status_code == 401
        # Cleanup
        client.delete(f"/players/{player['id']}", headers=admin_headers)
