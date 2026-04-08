"""E2e tests for per-player profile and statistics — Gap 7.

These tests require a running MeeplesShelf stack
(docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up).

Configuration is loaded from the project root .env file.
"""

import os
import uuid
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
def sample_data(client: httpx.Client, admin_headers: dict):
    """Create a game, 2 players, and 2 sessions with known outcomes."""
    uid = uuid.uuid4().hex[:8]

    # Game with scoring spec
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": f"E2E Profile Game {uid}",
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
    assert game_resp.status_code == 201
    game = game_resp.json()

    # Players
    players = []
    for suffix in ["Winner", "Loser"]:
        name = f"E2E_Profile_{suffix}_{uid}"
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 409:
            all_players = client.get("/players").json()
            player = next(p for p in all_players if p["name"] == name)
        else:
            assert resp.status_code == 201
            player = resp.json()
        players.append(player)

    # Session 1: Winner wins (50 vs 30)
    s1 = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "played_at": "2025-06-15T14:00:00",
            "players": [
                {"player_id": players[0]["id"], "score_data": {"points": 50}},
                {"player_id": players[1]["id"], "score_data": {"points": 30}},
            ],
        },
    )
    assert s1.status_code == 201

    # Session 2: Winner wins again (40 vs 20)
    s2 = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "played_at": "2025-06-20T18:00:00",
            "players": [
                {"player_id": players[0]["id"], "score_data": {"points": 40}},
                {"player_id": players[1]["id"], "score_data": {"points": 20}},
            ],
        },
    )
    assert s2.status_code == 201

    yield {"game": game, "players": players, "sessions": [s1.json(), s2.json()]}

    # Cleanup — deleting the game cascades to sessions
    client.delete(f"/games/{game['id']}", headers=admin_headers)
    for p in players:
        client.delete(f"/players/{p['id']}", headers=admin_headers)


# --- Auth Tests ---


class TestPlayerProfileAuth:
    def test_player_stats_is_public(
        self, client: httpx.Client, sample_data: dict
    ):
        """Player stats endpoint requires no auth."""
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        assert resp.status_code == 200


# --- Not Found Tests ---


class TestPlayerProfileNotFound:
    def test_nonexistent_player_returns_404(self, client: httpx.Client):
        resp = client.get("/players/99999/stats")
        assert resp.status_code == 404


# --- Response Shape Tests ---


class TestPlayerProfileShape:
    def test_response_has_all_fields(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "player_id" in data
        assert "player_name" in data
        assert "created_at" in data
        assert "sessions_played" in data
        assert "wins" in data
        assert "win_rate" in data
        assert "favorite_game" in data
        assert "games" in data
        assert "recent_sessions" in data
        assert "activity" in data

    def test_game_breakdown_shape(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        assert len(data["games"]) >= 1
        game = data["games"][0]
        assert "game_id" in game
        assert "game_name" in game
        assert "times_played" in game
        assert "wins" in game
        assert "win_rate" in game
        assert "avg_score" in game
        assert "best_score" in game
        assert "last_played" in game

    def test_recent_session_shape(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        assert len(data["recent_sessions"]) >= 1
        session = data["recent_sessions"][0]
        assert "session_id" in session
        assert "game_id" in session
        assert "game_name" in session
        assert "played_at" in session
        assert "total_score" in session
        assert "winner" in session


# --- Stats Calculation Tests ---


class TestPlayerProfileStats:
    def test_winner_overall_stats(
        self, client: httpx.Client, sample_data: dict
    ):
        """Winner won both sessions."""
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        assert data["sessions_played"] == 2
        assert data["wins"] == 2
        assert data["win_rate"] == 1.0

    def test_loser_overall_stats(
        self, client: httpx.Client, sample_data: dict
    ):
        """Loser lost both sessions."""
        player_id = sample_data["players"][1]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        assert data["sessions_played"] == 2
        assert data["wins"] == 0
        assert data["win_rate"] == 0.0

    def test_favorite_game(self, client: httpx.Client, sample_data: dict):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        assert data["favorite_game"] == sample_data["game"]["name"]


# --- Per-Game Breakdown Tests ---


class TestPlayerProfileGameBreakdown:
    def test_winner_game_breakdown(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        game_name = sample_data["game"]["name"]
        game = next(g for g in data["games"] if g["game_name"] == game_name)
        assert game["times_played"] == 2
        assert game["wins"] == 2
        assert game["win_rate"] == 1.0
        # Avg of 50 and 40 = 45.0
        assert game["avg_score"] == 45.0
        assert game["best_score"] == 50

    def test_loser_game_breakdown(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][1]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        game_name = sample_data["game"]["name"]
        game = next(g for g in data["games"] if g["game_name"] == game_name)
        assert game["times_played"] == 2
        assert game["wins"] == 0
        assert game["win_rate"] == 0.0
        # Avg of 30 and 20 = 25.0
        assert game["avg_score"] == 25.0
        assert game["best_score"] == 30


# --- Recent Sessions Tests ---


class TestPlayerProfileRecentSessions:
    def test_recent_sessions_ordered_desc(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        recent = data["recent_sessions"]
        assert len(recent) == 2
        # Most recent first (session 2: 2025-06-20)
        assert recent[0]["total_score"] == 40
        assert recent[0]["winner"] is True
        assert recent[1]["total_score"] == 50
        assert recent[1]["winner"] is True

    def test_loser_recent_sessions(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][1]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        recent = data["recent_sessions"]
        assert len(recent) == 2
        assert recent[0]["winner"] is False
        assert recent[1]["winner"] is False


# --- Activity Tests ---


class TestPlayerProfileActivity:
    def test_activity_has_12_months(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        activity = data["activity"]
        assert len(activity) == 12

    def test_activity_months_sorted(
        self, client: httpx.Client, sample_data: dict
    ):
        player_id = sample_data["players"][0]["id"]
        resp = client.get(f"/players/{player_id}/stats")
        data = resp.json()
        months = [a["month"] for a in data["activity"]]
        assert months == sorted(months)


# --- Edge Case Tests ---


class TestPlayerProfileEdgeCases:
    def test_player_with_no_sessions(
        self, client: httpx.Client, admin_headers: dict
    ):
        uid = uuid.uuid4().hex[:8]
        name = f"E2E_Profile_Loner_{uid}"
        resp = client.post(
            "/players", headers=admin_headers, json={"name": name}
        )
        assert resp.status_code == 201
        player = resp.json()

        try:
            stats_resp = client.get(f"/players/{player['id']}/stats")
            assert stats_resp.status_code == 200
            data = stats_resp.json()
            assert data["sessions_played"] == 0
            assert data["wins"] == 0
            assert data["win_rate"] == 0.0
            assert data["favorite_game"] is None
            assert data["games"] == []
            assert data["recent_sessions"] == []
            assert len(data["activity"]) == 12
            # All activity months should have 0 sessions
            assert all(a["session_count"] == 0 for a in data["activity"])
        finally:
            client.delete(f"/players/{player['id']}", headers=admin_headers)
