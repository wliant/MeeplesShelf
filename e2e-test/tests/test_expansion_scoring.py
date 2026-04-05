"""E2e tests for expansion scoring patch merging (Gap 1).

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
    """Create a game with a known scoring spec and an expansion that adds a field."""
    game_resp = client.post(
        "/games",
        headers=admin_headers,
        json={
            "name": "E2E Expansion Test Game",
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
            "name": "Expansion A",
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
    for name in ["E2E_Player_A", "E2E_Player_B"]:
        resp = client.post("/players", headers=admin_headers, json={"name": name})
        if resp.status_code == 201:
            players.append(resp.json())
        elif resp.status_code == 409:
            # Player already exists; find them
            all_resp = client.get("/players")
            all_players = all_resp.json()
            player = next(p for p in all_players if p["name"] == name)
            players.append(player)
        else:
            pytest.fail(f"Failed to create player {name}: {resp.text}")
    return players


class TestExpansionScoringPatches:
    def test_session_with_expansion_includes_expansion_field(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Score total includes the expansion's harbor field."""
        game = game_with_expansion["game"]
        expansion = game_with_expansion["expansion"]
        p1, p2 = two_players

        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "expansion_ids": [expansion["id"]],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 10, "bonus": 3, "harbor": 5}},
                    {"player_id": p2["id"], "score_data": {"points": 8, "bonus": 2, "harbor": 7}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()

        sp1 = next(sp for sp in session["players"] if sp["player_id"] == p1["id"])
        sp2 = next(sp for sp in session["players"] if sp["player_id"] == p2["id"])

        # p1: 10 + (3*2) + 5 = 21
        assert sp1["total_score"] == 21
        # p2: 8 + (2*2) + 7 = 19
        assert sp2["total_score"] == 19
        assert sp1["winner"] is True
        assert sp2["winner"] is False

    def test_session_without_expansion_ignores_expansion_data(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Without expansion selected, harbor field is not scored."""
        game = game_with_expansion["game"]
        p1, p2 = two_players

        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "expansion_ids": [],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 10, "bonus": 3, "harbor": 5}},
                    {"player_id": p2["id"], "score_data": {"points": 8, "bonus": 2, "harbor": 7}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()

        sp1 = next(sp for sp in session["players"] if sp["player_id"] == p1["id"])
        sp2 = next(sp for sp in session["players"] if sp["player_id"] == p2["id"])

        # p1: 10 + (3*2) = 16 (harbor ignored)
        assert sp1["total_score"] == 16
        # p2: 8 + (2*2) = 12
        assert sp2["total_score"] == 12

    def test_expansion_with_null_patch(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Expansion with null scoring_spec_patch doesn't change totals."""
        game = game_with_expansion["game"]
        p1, p2 = two_players

        # Create a second expansion with no scoring patch
        exp_resp = client.post(
            f"/games/{game['id']}/expansions",
            headers=admin_headers,
            json={"name": "Expansion No Patch"},
        )
        assert exp_resp.status_code == 201
        null_exp = exp_resp.json()

        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "expansion_ids": [null_exp["id"]],
                "players": [
                    {"player_id": p1["id"], "score_data": {"points": 10, "bonus": 3}},
                    {"player_id": p2["id"], "score_data": {"points": 8, "bonus": 2}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()

        sp1 = next(sp for sp in session["players"] if sp["player_id"] == p1["id"])
        # 10 + (3*2) = 16 (no patch applied)
        assert sp1["total_score"] == 16

    def test_expansion_override_field(
        self,
        client: httpx.Client,
        admin_headers: dict,
        two_players: list,
    ):
        """Expansion that overrides a field's multiplier changes the total."""
        # Create a fresh game
        game_resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Override Test",
                "min_players": 2,
                "max_players": 4,
                "scoring_spec": {
                    "version": 1,
                    "fields": [
                        {"id": "military", "label": "Military", "type": "numeric", "multiplier": 2},
                    ],
                },
            },
        )
        assert game_resp.status_code == 201
        game = game_resp.json()

        # Add expansion that changes multiplier from 2 to 5
        exp_resp = client.post(
            f"/games/{game['id']}/expansions",
            headers=admin_headers,
            json={
                "name": "Military Boost",
                "scoring_spec_patch": {
                    "version": 1,
                    "fields": [
                        {"id": "military", "label": "Military", "type": "numeric", "multiplier": 5},
                    ],
                },
            },
        )
        assert exp_resp.status_code == 201
        expansion = exp_resp.json()

        p1 = two_players[0]

        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": game["id"],
                "expansion_ids": [expansion["id"]],
                "players": [
                    {"player_id": p1["id"], "score_data": {"military": 4}},
                ],
            },
        )
        assert resp.status_code == 201
        session = resp.json()

        sp1 = next(sp for sp in session["players"] if sp["player_id"] == p1["id"])
        # 4 * 5 = 20 (with expansion)
        assert sp1["total_score"] == 20

        # Cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_wrong_game_expansion_rejected(
        self,
        client: httpx.Client,
        admin_headers: dict,
        game_with_expansion: dict,
        two_players: list,
    ):
        """Expansion from a different game should be rejected with 400."""
        expansion = game_with_expansion["expansion"]
        p1 = two_players[0]

        # Create another game
        other_resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Other Game", "min_players": 2, "max_players": 4},
        )
        assert other_resp.status_code == 201
        other_game = other_resp.json()

        resp = client.post(
            "/sessions",
            headers=admin_headers,
            json={
                "game_id": other_game["id"],
                "expansion_ids": [expansion["id"]],  # belongs to a different game
                "players": [
                    {"player_id": p1["id"], "score_data": {}},
                ],
            },
        )
        assert resp.status_code == 400

        # Cleanup
        client.delete(f"/games/{other_game['id']}", headers=admin_headers)
