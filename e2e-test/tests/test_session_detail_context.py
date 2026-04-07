"""E2e tests for session detail context improvements — Gap 22.

Verifies that session detail API responses include notes, expansions,
and winner data, and that the game name search filter works for
cross-navigation from session detail to inventory.

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
def game_with_expansion(client: httpx.Client, admin_headers: dict):
    """Create a game with scoring spec and an expansion."""
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Detail Context Game",
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

    exp_resp = client.post(
        f"/games/{game['id']}/expansions",
        headers=admin_headers,
        json={
            "name": "Detail Test Expansion",
            "scoring_spec_patch": {
                "version": 1,
                "fields": [
                    {"id": "harbor", "label": "Harbor", "type": "raw_score"},
                ],
            },
        },
    )
    assert exp_resp.status_code == 201
    expansion = exp_resp.json()

    yield {"game": game, "expansion": expansion}

    client.delete(f"/games/{game['id']}", headers=admin_headers)


@pytest.fixture()
def players(client: httpx.Client, admin_headers: dict):
    """Create two test players."""
    created = []
    for name in ["DetailAlice", "DetailBob"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        assert resp.status_code in (201, 200), f"Create player failed: {resp.text}"
        created.append(resp.json())
    yield created
    for p in created:
        client.delete(f"/players/{p['id']}", headers=admin_headers)


@pytest.fixture()
def session_with_context(
    client: httpx.Client,
    admin_headers: dict,
    game_with_expansion: dict,
    players: list,
):
    """Create a session with notes, expansions, and clear winner."""
    game = game_with_expansion["game"]
    expansion = game_with_expansion["expansion"]

    resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "notes": "A really fun game night session!",
            "expansion_ids": [expansion["id"]],
            "players": [
                {
                    "player_id": players[0]["id"],
                    "score_data": {"points": 50, "harbor": 10},
                },
                {
                    "player_id": players[1]["id"],
                    "score_data": {"points": 30, "harbor": 5},
                },
            ],
        },
    )
    assert resp.status_code == 201
    session = resp.json()
    yield session
    client.delete(f"/sessions/{session['id']}", headers=admin_headers)


class TestSessionDetailReturnsNotes:
    def test_session_has_notes(self, session_with_context):
        assert session_with_context["notes"] == "A really fun game night session!"

    def test_session_without_notes(self, client, admin_headers, game_with_expansion, players):
        game = game_with_expansion["game"]
        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "players": [
                    {"player_id": players[0]["id"], "score_data": {"points": 10}},
                    {"player_id": players[1]["id"], "score_data": {"points": 20}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()
        assert session["notes"] is None
        client.delete(f"/sessions/{session['id']}", headers=admin_headers)


class TestSessionDetailReturnsExpansions:
    def test_session_has_expansions(self, session_with_context, game_with_expansion):
        expansions = session_with_context["expansions"]
        assert len(expansions) == 1
        assert expansions[0]["name"] == "Detail Test Expansion"
        assert expansions[0]["id"] == game_with_expansion["expansion"]["id"]

    def test_session_without_expansions(self, client, admin_headers, game_with_expansion, players):
        game = game_with_expansion["game"]
        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "players": [
                    {"player_id": players[0]["id"], "score_data": {"points": 10}},
                    {"player_id": players[1]["id"], "score_data": {"points": 20}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()
        assert session["expansions"] == []
        client.delete(f"/sessions/{session['id']}", headers=admin_headers)


class TestSessionDetailWinners:
    def test_winner_flag_on_highest_scorer(self, session_with_context):
        players = session_with_context["players"]
        winner = [p for p in players if p["winner"]]
        loser = [p for p in players if not p["winner"]]
        assert len(winner) == 1
        assert winner[0]["player"]["name"] == "DetailAlice"
        assert winner[0]["total_score"] == 60  # points=50 + harbor=10
        assert len(loser) == 1
        assert loser[0]["player"]["name"] == "DetailBob"
        assert loser[0]["total_score"] == 35  # points=30 + harbor=5

    def test_game_brief_in_session(self, session_with_context, game_with_expansion):
        game_brief = session_with_context["game"]
        assert game_brief["id"] == game_with_expansion["game"]["id"]
        assert game_brief["name"] == "E2E Detail Context Game"


class TestGameSearchFilter:
    """Test that searching games by name works for cross-navigation."""

    def test_search_by_exact_name(self, client, game_with_expansion):
        resp = client.get("/games", params={"name": "E2E Detail Context Game"})
        assert resp.status_code == 200
        items = resp.json()["items"]
        match = [g for g in items if g["id"] == game_with_expansion["game"]["id"]]
        assert len(match) == 1
        assert match[0]["name"] == "E2E Detail Context Game"

    def test_search_by_partial_name(self, client, game_with_expansion):
        resp = client.get("/games", params={"name": "Detail Context"})
        assert resp.status_code == 200
        items = resp.json()["items"]
        match = [g for g in items if g["id"] == game_with_expansion["game"]["id"]]
        assert len(match) == 1

    def test_search_no_match(self, client):
        resp = client.get("/games", params={"name": "NonexistentGameXYZ12345"})
        assert resp.status_code == 200
        assert resp.json()["items"] == []
