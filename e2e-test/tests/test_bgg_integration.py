"""E2e tests for BoardGameGeek integration — Gap 11.

These tests require a running MeeplesShelf stack.
Tests that call the real BGG API also need:
  - Internet access
  - APP_BGG_API_TOKEN set in .env (register at boardgamegeek.com/using_the_xml_api)

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

_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)

_app_port = os.environ.get("APP_PORT", "8000")
BASE_URL = os.environ.get("E2E_BASE_URL", f"http://localhost:{_app_port}/api")
ADMIN_PASS = os.environ.get("APP_ADMIN_PASSWORD", "changeme")
BGG_TOKEN = os.environ.get("APP_BGG_API_TOKEN", "")

# Skip tests that require a real BGG token when not configured
requires_bgg_token = pytest.mark.skipif(
    not BGG_TOKEN, reason="APP_BGG_API_TOKEN not set — skipping live BGG tests"
)


@pytest.fixture()
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c


@pytest.fixture()
def admin_headers(client):
    resp = client.post("/auth/token", json={"password": ADMIN_PASS})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def game(client, admin_headers):
    """Create a temporary game and clean up after test."""
    name = f"E2E BGG {uuid.uuid4().hex[:8]}"
    resp = client.post(
        "/games",
        headers=admin_headers,
        json={"name": name, "min_players": 2, "max_players": 4},
    )
    assert resp.status_code == 201
    g = resp.json()
    yield g
    client.delete(f"/games/{g['id']}", headers=admin_headers)


# ── BGG Search ──────────────────────────────────────────────


class TestBGGSearch:
    @requires_bgg_token
    def test_search_returns_results(self, client, admin_headers):
        resp = client.get(
            "/bgg/search", headers=admin_headers, params={"query": "Catan"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) > 0
        first = data["results"][0]
        assert "bgg_id" in first
        assert "name" in first

    @requires_bgg_token
    def test_search_results_capped_at_25(self, client, admin_headers):
        resp = client.get(
            "/bgg/search", headers=admin_headers, params={"query": "game"}
        )
        assert resp.status_code == 200
        assert len(resp.json()["results"]) <= 25

    def test_search_requires_admin(self, client):
        resp = client.get("/bgg/search", params={"query": "Catan"})
        assert resp.status_code in (401, 403)

    def test_search_too_short_query(self, client, admin_headers):
        resp = client.get(
            "/bgg/search", headers=admin_headers, params={"query": "X"}
        )
        assert resp.status_code == 422

    def test_search_without_token_returns_503(self, client, admin_headers):
        """When no BGG token is configured, endpoints return 503 with a helpful message."""
        if BGG_TOKEN:
            pytest.skip("BGG token is configured — cannot test 503 path")
        resp = client.get(
            "/bgg/search", headers=admin_headers, params={"query": "Catan"}
        )
        assert resp.status_code == 503
        assert "APP_BGG_API_TOKEN" in resp.json()["detail"]


# ── BGG Details ─────────────────────────────────────────────


class TestBGGDetails:
    @requires_bgg_token
    def test_details_returns_game_info(self, client, admin_headers):
        # BGG ID 13 = "Catan" (known stable ID)
        resp = client.get("/bgg/details/13", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["bgg_id"] == 13
        assert "Catan" in data["name"]
        assert data["min_players"] is not None
        assert data["max_players"] is not None
        assert isinstance(data["categories"], list)
        assert isinstance(data["mechanics"], list)

    def test_details_requires_admin(self, client):
        resp = client.get("/bgg/details/13")
        assert resp.status_code in (401, 403)

    @requires_bgg_token
    def test_details_includes_image_url(self, client, admin_headers):
        resp = client.get("/bgg/details/13", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["image_url"] is not None
        assert data["thumbnail_url"] is not None

    def test_details_without_token_returns_503(self, client, admin_headers):
        if BGG_TOKEN:
            pytest.skip("BGG token is configured — cannot test 503 path")
        resp = client.get("/bgg/details/13", headers=admin_headers)
        assert resp.status_code == 503
        assert "APP_BGG_API_TOKEN" in resp.json()["detail"]


# ── BGG Image Import ────────────────────────────────────────


class TestBGGImageImport:
    @requires_bgg_token
    def test_import_image_from_bgg(self, client, admin_headers, game):
        resp = client.post(
            "/bgg/import-image/13",
            headers=admin_headers,
            params={"game_id": game["id"]},
        )
        assert resp.status_code == 200
        assert resp.json()["image_url"] is not None

        # Verify game now has an image
        detail = client.get(f"/games/{game['id']}")
        assert detail.status_code == 200
        assert detail.json()["image_url"] is not None

    def test_import_image_requires_admin(self, client, game):
        resp = client.post(
            "/bgg/import-image/13", params={"game_id": game["id"]}
        )
        assert resp.status_code in (401, 403)

    def test_import_image_nonexistent_game(self, client, admin_headers):
        resp = client.post(
            "/bgg/import-image/13",
            headers=admin_headers,
            params={"game_id": 99999},
        )
        assert resp.status_code == 404


# ── Game with bgg_id ────────────────────────────────────────


class TestGameWithBggId:
    def test_create_game_with_bgg_id(self, client, admin_headers):
        name = f"E2E BGG ID {uuid.uuid4().hex[:8]}"
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name, "min_players": 2, "max_players": 4, "bgg_id": 13},
        )
        assert resp.status_code == 201
        game = resp.json()
        assert game["bgg_id"] == 13
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_create_game_without_bgg_id(self, client, admin_headers):
        name = f"E2E No BGG {uuid.uuid4().hex[:8]}"
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name},
        )
        assert resp.status_code == 201
        assert resp.json()["bgg_id"] is None
        client.delete(f"/games/{resp.json()['id']}", headers=admin_headers)

    def test_bgg_id_in_game_detail(self, client, admin_headers):
        name = f"E2E BGG Detail {uuid.uuid4().hex[:8]}"
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name, "bgg_id": 42},
        )
        assert resp.status_code == 201
        game_id = resp.json()["id"]
        detail = client.get(f"/games/{game_id}")
        assert detail.status_code == 200
        assert detail.json()["bgg_id"] == 42
        client.delete(f"/games/{game_id}", headers=admin_headers)

    def test_update_game_bgg_id(self, client, admin_headers, game):
        resp = client.put(
            f"/games/{game['id']}",
            headers=admin_headers,
            json={"bgg_id": 55},
        )
        assert resp.status_code == 200
        assert resp.json()["bgg_id"] == 55

    def test_bgg_id_in_game_list(self, client, admin_headers):
        name = f"E2E BGG List {uuid.uuid4().hex[:8]}"
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name, "bgg_id": 77},
        )
        assert resp.status_code == 201
        game_id = resp.json()["id"]

        list_resp = client.get("/games", params={"name": name})
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        assert any(g["bgg_id"] == 77 for g in items)

        client.delete(f"/games/{game_id}", headers=admin_headers)
