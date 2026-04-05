"""E2e tests for data export — Gap 6.

These tests require a running MeeplesShelf stack
(docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up).

Configuration is loaded from the project root .env file.
"""

import csv
import io
import json
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
    """Create a game with expansion, a player, and a session for export tests."""
    # Create game with scoring spec
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Export Game",
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

    # Create expansion
    exp_resp = client.post(
        f"/games/{game['id']}/expansions",
        headers=admin_headers,
        json={"name": "E2E Export Expansion"},
    )
    assert exp_resp.status_code == 201
    expansion = exp_resp.json()

    # Create player (handle existing)
    player_name = "E2E_Export_Player"
    player_resp = client.post(
        "/players", headers=admin_headers, json={"name": player_name}
    )
    if player_resp.status_code == 409:
        players = client.get("/players").json()
        player = next(p for p in players if p["name"] == player_name)
    else:
        assert player_resp.status_code == 201
        player = player_resp.json()

    # Create session
    session_resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "played_at": "2025-07-01T14:00:00",
            "notes": "Export test session",
            "expansion_ids": [expansion["id"]],
            "players": [
                {"player_id": player["id"], "score_data": {"points": 42}},
            ],
        },
    )
    assert session_resp.status_code == 201
    session = session_resp.json()

    yield {"game": game, "expansion": expansion, "player": player, "session": session}

    # Cleanup — deleting the game cascades to expansions and sessions
    client.delete(f"/games/{game['id']}", headers=admin_headers)


# --- JSON Export Tests ---


class TestJsonExport:
    def test_export_json_requires_admin(self, client: httpx.Client):
        resp = client.get("/export")
        assert resp.status_code == 401

    def test_export_json_structure(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "meta" in data
        assert "games" in data
        assert "players" in data
        assert "sessions" in data

    def test_export_meta_fields(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        data = resp.json()
        meta = data["meta"]
        assert "exported_at" in meta
        assert "version" in meta
        assert meta["version"] == "0.1.0"

    def test_export_json_contains_data(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        data = resp.json()

        game_names = [g["name"] for g in data["games"]]
        assert "E2E Export Game" in game_names

        player_names = [p["name"] for p in data["players"]]
        assert "E2E_Export_Player" in player_names

        session_ids = [s["id"] for s in data["sessions"]]
        assert sample_data["session"]["id"] in session_ids

    def test_export_games_include_expansions(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        data = resp.json()

        game = next(g for g in data["games"] if g["name"] == "E2E Export Game")
        exp_names = [e["name"] for e in game["expansions"]]
        assert "E2E Export Expansion" in exp_names

    def test_export_sessions_include_scores(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        data = resp.json()

        session = next(
            s for s in data["sessions"] if s["id"] == sample_data["session"]["id"]
        )
        assert len(session["players"]) == 1
        sp = session["players"][0]
        assert sp["total_score"] == 42
        assert sp["winner"] is True
        assert sp["score_data"] == {"points": 42}

    def test_export_json_content_disposition(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export", headers=admin_headers)
        cd = resp.headers.get("content-disposition", "")
        assert "attachment" in cd
        assert ".json" in cd


# --- CSV Export Tests ---


class TestCsvExport:
    def test_csv_requires_admin(self, client: httpx.Client):
        resp = client.get("/export/sessions/csv")
        assert resp.status_code == 401

    def test_csv_content_type(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export/sessions/csv", headers=admin_headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

    def test_csv_has_headers(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export/sessions/csv", headers=admin_headers)
        reader = csv.reader(io.StringIO(resp.text))
        headers = next(reader)
        assert "session_id" in headers
        assert "game_name" in headers
        assert "played_at" in headers
        assert "player_name" in headers
        assert "total_score" in headers
        assert "winner" in headers
        assert "score_data" in headers

    def test_csv_contains_session_data(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export/sessions/csv", headers=admin_headers)
        reader = csv.reader(io.StringIO(resp.text))
        headers = next(reader)
        rows = list(reader)

        game_name_idx = headers.index("game_name")
        player_name_idx = headers.index("player_name")
        total_score_idx = headers.index("total_score")
        winner_idx = headers.index("winner")
        score_data_idx = headers.index("score_data")

        matching = [r for r in rows if r[game_name_idx] == "E2E Export Game"]
        assert len(matching) >= 1

        row = matching[0]
        assert row[player_name_idx] == "E2E_Export_Player"
        assert row[total_score_idx] == "42"
        assert row[winner_idx] == "True"
        score_data = json.loads(row[score_data_idx])
        assert score_data == {"points": 42}

    def test_csv_content_disposition(
        self, client: httpx.Client, admin_headers: dict, sample_data: dict
    ):
        resp = client.get("/export/sessions/csv", headers=admin_headers)
        cd = resp.headers.get("content-disposition", "")
        assert "attachment" in cd
        assert ".csv" in cd
