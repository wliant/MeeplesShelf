"""E2e tests for session editing — PUT /api/sessions/{id} (Gap 2).

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
def game_with_expansion(client: httpx.Client, admin_headers: dict):
    """Create a game with a known scoring spec and an expansion."""
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Session Edit Game",
            "min_players": 2,
            "max_players": 4,
            "scoring_spec": {
                "version": 1,
                "fields": [
                    {"id": "points", "label": "Points", "type": "raw_score"},
                    {"id": "bonus", "label": "Bonus", "type": "numeric", "multiplier": 2},
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
            "name": "Edit Test Expansion",
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

    # Cleanup: deleting the game cascades to expansions and sessions
    client.delete(f"/games/{game['id']}", headers=admin_headers)


@pytest.fixture()
def two_players(client: httpx.Client, admin_headers: dict):
    """Ensure two unique players exist and return them."""
    players = []
    for name in ["E2E_Edit_Player_A", "E2E_Edit_Player_B"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 201:
            players.append(resp.json())
        elif resp.status_code == 409:
            all_resp = client.get("/players")
            all_players = all_resp.json()
            player = next(p for p in all_players if p["name"] == name)
            players.append(player)
        else:
            pytest.fail(f"Failed to create player {name}: {resp.text}")
    return players


def _create_session(client, admin_headers, game, players, expansion_ids=None, score_overrides=None):
    """Helper to create a session and return the response JSON."""
    default_scores = [
        {"player_id": players[0]["id"], "score_data": {"points": 10, "bonus": 3}},
        {"player_id": players[1]["id"], "score_data": {"points": 8, "bonus": 2}},
    ]
    if score_overrides:
        default_scores = score_overrides
    resp = client.post(
        "/sessions",
        headers=admin_headers,
        json={
            "game_id": game["id"],
            "expansion_ids": expansion_ids or [],
            "players": default_scores,
        },
    )
    assert resp.status_code == 201
    return resp.json()


class TestSessionEdit:
    def test_update_session_scores(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Updating scores recalculates totals and preserves game_id."""
        game = game_with_expansion["game"]
        p1, p2 = two_players

        session = _create_session(client, admin_headers, game, two_players)
        session_id = session["id"]

        # Original: p1=10+(3*2)=16, p2=8+(2*2)=12
        assert next(sp for sp in session["players"] if sp["player_id"] == p1["id"])["total_score"] == 16

        # Update with new scores
        resp = client.put(
            f"/sessions/{session_id}",
            headers=admin_headers,
            json={
                "played_at": "2025-06-15T18:00:00",
                "notes": "Updated session",
                "expansion_ids": [],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 5, "bonus": 1}},
                    {"player_id": p2["id"], "score_data": {"points": 20, "bonus": 4}},
                ],
            },
        )
        assert resp.status_code == 200
        updated = resp.json()

        # Game should be unchanged
        assert updated["game_id"] == game["id"]
        assert updated["notes"] == "Updated session"
        assert "2025-06-15" in updated["played_at"]

        sp1 = next(sp for sp in updated["players"] if sp["player_id"] == p1["id"])
        sp2 = next(sp for sp in updated["players"] if sp["player_id"] == p2["id"])

        # p1: 5 + (1*2) = 7
        assert sp1["total_score"] == 7
        # p2: 20 + (4*2) = 28
        assert sp2["total_score"] == 28

    def test_update_session_adds_expansion(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Adding an expansion on update applies scoring patch."""
        game = game_with_expansion["game"]
        expansion = game_with_expansion["expansion"]
        p1, p2 = two_players

        # Create without expansion
        session = _create_session(client, admin_headers, game, two_players)
        session_id = session["id"]

        # Update with expansion and harbor scores
        resp = client.put(
            f"/sessions/{session_id}",
            headers=admin_headers,
            json={
                "expansion_ids": [expansion["id"]],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 10, "bonus": 3, "harbor": 5}},
                    {"player_id": p2["id"], "score_data": {"points": 8, "bonus": 2, "harbor": 7}},
                ],
            },
        )
        assert resp.status_code == 200
        updated = resp.json()

        sp1 = next(sp for sp in updated["players"] if sp["player_id"] == p1["id"])
        sp2 = next(sp for sp in updated["players"] if sp["player_id"] == p2["id"])

        # p1: 10 + (3*2) + 5 = 21
        assert sp1["total_score"] == 21
        # p2: 8 + (2*2) + 7 = 19
        assert sp2["total_score"] == 19
        assert len(updated["expansions"]) == 1

    def test_update_session_replaces_players(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Updating with fewer players removes the missing ones."""
        game = game_with_expansion["game"]
        p1, p2 = two_players

        session = _create_session(client, admin_headers, game, two_players)
        session_id = session["id"]
        assert len(session["players"]) == 2

        # Update with only player 1
        resp = client.put(
            f"/sessions/{session_id}",
            headers=admin_headers,
            json={
                "expansion_ids": [],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 15, "bonus": 5}},
                ],
            },
        )
        assert resp.status_code == 200
        updated = resp.json()

        assert len(updated["players"]) == 1
        assert updated["players"][0]["player_id"] == p1["id"]
        # 15 + (5*2) = 25
        assert updated["players"][0]["total_score"] == 25

    def test_update_session_not_found(
        self,
        client: httpx.Client,
        admin_headers: dict,
    ):
        """PUT to nonexistent session returns 404."""
        resp = client.put(
            "/sessions/999999",
            headers=admin_headers,
            json={
                "expansion_ids": [],
                "players": [],
            },
        )
        assert resp.status_code == 404

    def test_update_session_wrong_expansion(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Expansion from a different game is rejected with 400."""
        game = game_with_expansion["game"]
        expansion = game_with_expansion["expansion"]
        p1 = two_players[0]

        # Create another game
        other_resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Other Edit Game", "min_players": 2, "max_players": 4},
        )
        assert other_resp.status_code == 201
        other_game = other_resp.json()

        # Create a session for the other game
        session_resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": other_game["id"],
                "players": [{"player_id": p1["id"], "score_data": {}}],
            },
        )
        assert session_resp.status_code == 201
        session = session_resp.json()

        # Try to update with expansion from a different game
        resp = client.put(
            f"/sessions/{session['id']}",
            headers=admin_headers,
            json={
                "expansion_ids": [expansion["id"]],
                "players": [{"player_id": p1["id"], "score_data": {}}],
            },
        )
        assert resp.status_code == 400

        # Cleanup
        client.delete(f"/games/{other_game['id']}", headers=admin_headers)

    def test_update_session_requires_admin(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """PUT without auth returns 401."""
        game = game_with_expansion["game"]
        session = _create_session(client, admin_headers, game, two_players)

        resp = client.put(
            f"/sessions/{session['id']}",
            json={
                "expansion_ids": [],
                "players": [],
            },
        )
        assert resp.status_code == 401

    def test_update_session_changes_winner(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Updating scores can change the winner."""
        game = game_with_expansion["game"]
        p1, p2 = two_players

        session = _create_session(client, admin_headers, game, two_players)
        session_id = session["id"]

        # Original: p1=16, p2=12 → p1 wins
        sp1_orig = next(sp for sp in session["players"] if sp["player_id"] == p1["id"])
        assert sp1_orig["winner"] is True

        # Update: flip scores so p2 wins
        resp = client.put(
            f"/sessions/{session_id}",
            headers=admin_headers,
            json={
                "expansion_ids": [],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 1, "bonus": 0}},
                    {"player_id": p2["id"], "score_data": {"points": 50, "bonus": 10}},
                ],
            },
        )
        assert resp.status_code == 200
        updated = resp.json()

        sp1 = next(sp for sp in updated["players"] if sp["player_id"] == p1["id"])
        sp2 = next(sp for sp in updated["players"] if sp["player_id"] == p2["id"])

        assert sp1["winner"] is False
        assert sp2["winner"] is True
        # p2: 50 + (10*2) = 70
        assert sp2["total_score"] == 70
