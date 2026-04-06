"""E2e tests for statistics and analytics — Gap 3.

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
def sample_data(client: httpx.Client, admin_headers: dict):
    """Create a game, 2 players, and 2 sessions with known outcomes."""
    # Game with scoring spec
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Stats Game",
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
    for name in ["E2E_Stats_PlayerA", "E2E_Stats_PlayerB"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 409:
            all_players = client.get("/players").json()
            player = next(p for p in all_players if p["name"] == name)
        else:
            assert resp.status_code == 201
            player = resp.json()
        players.append(player)

    # Session 1: PlayerA wins (50 vs 30)
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

    # Session 2: PlayerA wins again (40 vs 20)
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


# --- Auth Tests ---


class TestStatsAuth:
    """All stats endpoints must be publicly accessible (no auth required)."""

    def test_overview_is_public(self, client: httpx.Client):
        resp = client.get("/stats/overview")
        assert resp.status_code == 200

    def test_players_is_public(self, client: httpx.Client):
        resp = client.get("/stats/players")
        assert resp.status_code == 200

    def test_games_is_public(self, client: httpx.Client):
        resp = client.get("/stats/games")
        assert resp.status_code == 200

    def test_activity_is_public(self, client: httpx.Client):
        resp = client.get("/stats/activity")
        assert resp.status_code == 200


# --- Overview Tests ---


class TestStatsOverview:
    def test_overview_shape(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_games" in data
        assert "total_sessions" in data
        assert "total_players" in data
        assert "recent_sessions" in data
        assert "most_recent_session_date" in data

    def test_overview_counts(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/overview")
        data = resp.json()
        # At least our test data should be counted
        assert data["total_games"] >= 1
        assert data["total_sessions"] >= 2
        assert data["total_players"] >= 2


# --- Player Stats Tests ---


class TestStatsPlayers:
    def test_all_players_present(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/players")
        assert resp.status_code == 200
        data = resp.json()
        names = [p["player_name"] for p in data]
        assert "E2E_Stats_PlayerA" in names
        assert "E2E_Stats_PlayerB" in names

    def test_player_stats_shape(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/players")
        data = resp.json()
        player = next(p for p in data if p["player_name"] == "E2E_Stats_PlayerA")
        assert "player_id" in player
        assert "sessions_played" in player
        assert "wins" in player
        assert "win_rate" in player

    def test_win_rate_calculation(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/players")
        data = resp.json()

        player_a = next(p for p in data if p["player_name"] == "E2E_Stats_PlayerA")
        # PlayerA won both sessions
        assert player_a["sessions_played"] >= 2
        assert player_a["wins"] >= 2
        assert player_a["win_rate"] > 0

        player_b = next(p for p in data if p["player_name"] == "E2E_Stats_PlayerB")
        # PlayerB lost both sessions
        assert player_b["sessions_played"] >= 2
        # win_rate should be lower than PlayerA's
        assert player_b["win_rate"] < player_a["win_rate"]

    def test_player_with_no_sessions(
        self, client: httpx.Client, admin_headers: dict
    ):
        """A player with zero sessions still appears with win_rate=0."""
        resp = client.post(
            "/players",
            headers=admin_headers,
            json={"name": "E2E_Stats_Loner"},
        )
        if resp.status_code == 409:
            all_players = client.get("/players").json()
            player = next(p for p in all_players if p["name"] == "E2E_Stats_Loner")
        else:
            assert resp.status_code == 201
            player = resp.json()

        try:
            stats_resp = client.get("/stats/players")
            data = stats_resp.json()
            loner = next(p for p in data if p["player_name"] == "E2E_Stats_Loner")
            assert loner["sessions_played"] == 0
            assert loner["wins"] == 0
            assert loner["win_rate"] == 0.0
        finally:
            client.delete(f"/players/{player['id']}", headers=admin_headers)


# --- Game Stats Tests ---


class TestStatsGames:
    def test_all_games_present(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/games")
        assert resp.status_code == 200
        data = resp.json()
        names = [g["game_name"] for g in data]
        assert "E2E Stats Game" in names

    def test_game_stats_shape(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/games")
        data = resp.json()
        game = next(g for g in data if g["game_name"] == "E2E Stats Game")
        assert "game_id" in game
        assert "times_played" in game
        assert "unique_players" in game
        assert "last_played" in game

    def test_game_play_count(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/games")
        data = resp.json()
        game = next(g for g in data if g["game_name"] == "E2E Stats Game")
        assert game["times_played"] == 2
        assert game["unique_players"] == 2

    def test_unplayed_game(self, client: httpx.Client, admin_headers: dict):
        """A game with zero sessions still appears with times_played=0."""
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Stats Unplayed",
                "min_players": 2,
                "max_players": 4,
            },
        )
        assert resp.status_code == 201
        game = resp.json()

        try:
            stats_resp = client.get("/stats/games")
            data = stats_resp.json()
            unplayed = next(g for g in data if g["game_name"] == "E2E Stats Unplayed")
            assert unplayed["times_played"] == 0
            assert unplayed["unique_players"] == 0
            assert unplayed["last_played"] is None
        finally:
            client.delete(f"/games/{game['id']}", headers=admin_headers)


# --- Activity Tests ---


class TestStatsActivity:
    def test_activity_returns_months(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/activity")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 12  # default 12 months
        for entry in data:
            assert "month" in entry
            assert "session_count" in entry

    def test_activity_months_sorted(self, client: httpx.Client, sample_data: dict):
        resp = client.get("/stats/activity")
        data = resp.json()
        months = [e["month"] for e in data]
        assert months == sorted(months)

    def test_activity_custom_months_param(
        self, client: httpx.Client, sample_data: dict
    ):
        resp = client.get("/stats/activity", params={"months": 6})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 6

    def test_activity_contains_session_month(
        self, client: httpx.Client, sample_data: dict
    ):
        resp = client.get("/stats/activity", params={"months": 24})
        data = resp.json()
        # Our test sessions are in 2025-06
        june_entry = next((e for e in data if e["month"] == "2025-06"), None)
        if june_entry is not None:
            assert june_entry["session_count"] >= 2
