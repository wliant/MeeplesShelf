"""E2e tests for tags and categories — Gap 9.

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
def tag_strategy(client: httpx.Client, admin_headers: dict):
    resp = client.post("/tags", headers=admin_headers, json={"name": "E2E Strategy"})
    if resp.status_code == 409:
        tags = client.get("/tags").json()
        tag = next(t for t in tags if t["name"].lower() == "e2e strategy")
        yield tag
        return
    assert resp.status_code == 201
    tag = resp.json()
    yield tag
    client.delete(f"/tags/{tag['id']}", headers=admin_headers)


@pytest.fixture()
def tag_euro(client: httpx.Client, admin_headers: dict):
    resp = client.post("/tags", headers=admin_headers, json={"name": "E2E Euro"})
    if resp.status_code == 409:
        tags = client.get("/tags").json()
        tag = next(t for t in tags if t["name"].lower() == "e2e euro")
        yield tag
        return
    assert resp.status_code == 201
    tag = resp.json()
    yield tag
    client.delete(f"/tags/{tag['id']}", headers=admin_headers)


@pytest.fixture()
def tag_party(client: httpx.Client, admin_headers: dict):
    resp = client.post("/tags", headers=admin_headers, json={"name": "E2E Party"})
    if resp.status_code == 409:
        tags = client.get("/tags").json()
        tag = next(t for t in tags if t["name"].lower() == "e2e party")
        yield tag
        return
    assert resp.status_code == 201
    tag = resp.json()
    yield tag
    client.delete(f"/tags/{tag['id']}", headers=admin_headers)


# ---- Tag CRUD ----


class TestTagCRUD:
    def test_create_tag(self, client: httpx.Client, admin_headers: dict):
        resp = client.post(
            "/tags", headers=admin_headers, json={"name": "E2E Temp Tag"}
        )
        assert resp.status_code == 201
        tag = resp.json()
        assert tag["name"] == "E2E Temp Tag"
        assert "id" in tag
        assert "created_at" in tag
        # cleanup
        client.delete(f"/tags/{tag['id']}", headers=admin_headers)

    def test_list_tags(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.get("/tags")
        assert resp.status_code == 200
        tags = resp.json()
        assert isinstance(tags, list)
        names = [t["name"] for t in tags]
        assert tag_strategy["name"] in names

    def test_list_tags_sorted_by_name(
        self,
        client: httpx.Client,
        admin_headers: dict,
        tag_strategy: dict,
        tag_euro: dict,
    ):
        resp = client.get("/tags")
        tags = resp.json()
        names = [t["name"] for t in tags]
        assert names == sorted(names)

    def test_create_duplicate_rejected(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.post(
            "/tags", headers=admin_headers, json={"name": tag_strategy["name"]}
        )
        assert resp.status_code == 409

    def test_create_duplicate_case_insensitive(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.post(
            "/tags",
            headers=admin_headers,
            json={"name": tag_strategy["name"].upper()},
        )
        assert resp.status_code == 409

    def test_delete_tag(self, client: httpx.Client, admin_headers: dict):
        resp = client.post(
            "/tags", headers=admin_headers, json={"name": "E2E Delete Me"}
        )
        assert resp.status_code == 201
        tag_id = resp.json()["id"]
        resp = client.delete(f"/tags/{tag_id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_nonexistent(self, client: httpx.Client, admin_headers: dict):
        resp = client.delete("/tags/99999", headers=admin_headers)
        assert resp.status_code == 404

    def test_create_requires_admin(self, client: httpx.Client):
        resp = client.post("/tags", json={"name": "E2E No Auth"})
        assert resp.status_code == 401

    def test_create_empty_name(self, client: httpx.Client, admin_headers: dict):
        resp = client.post("/tags", headers=admin_headers, json={"name": ""})
        assert resp.status_code == 422

    def test_create_whitespace_name(self, client: httpx.Client, admin_headers: dict):
        resp = client.post("/tags", headers=admin_headers, json={"name": "   "})
        assert resp.status_code == 422


# ---- Game + Tag Assignment ----


class TestGameTagAssignment:
    def test_create_game_with_tags(
        self,
        client: httpx.Client,
        admin_headers: dict,
        tag_strategy: dict,
        tag_euro: dict,
    ):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Tagged Game",
                "tag_ids": [tag_strategy["id"], tag_euro["id"]],
            },
        )
        assert resp.status_code == 201
        game = resp.json()
        tag_names = sorted(t["name"] for t in game["tags"])
        assert tag_strategy["name"] in tag_names
        assert tag_euro["name"] in tag_names
        # cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_update_game_tags(
        self,
        client: httpx.Client,
        admin_headers: dict,
        tag_strategy: dict,
        tag_euro: dict,
    ):
        # Create game with one tag
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Update Tags", "tag_ids": [tag_strategy["id"]]},
        )
        assert resp.status_code == 201
        game = resp.json()
        assert len(game["tags"]) == 1

        # Update to different tag
        resp = client.put(
            f"/games/{game['id']}",
            headers=admin_headers,
            json={"tag_ids": [tag_euro["id"]]},
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert len(updated["tags"]) == 1
        assert updated["tags"][0]["name"] == tag_euro["name"]
        # cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_clear_game_tags(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Clear Tags", "tag_ids": [tag_strategy["id"]]},
        )
        assert resp.status_code == 201
        game = resp.json()
        assert len(game["tags"]) == 1

        # Clear all tags
        resp = client.put(
            f"/games/{game['id']}",
            headers=admin_headers,
            json={"tag_ids": []},
        )
        assert resp.status_code == 200
        assert len(resp.json()["tags"]) == 0
        # cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)

    def test_game_read_includes_tags(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Read Tags", "tag_ids": [tag_strategy["id"]]},
        )
        assert resp.status_code == 201
        game_id = resp.json()["id"]

        resp = client.get(f"/games/{game_id}")
        assert resp.status_code == 200
        game = resp.json()
        assert len(game["tags"]) == 1
        assert game["tags"][0]["name"] == tag_strategy["name"]
        # cleanup
        client.delete(f"/games/{game_id}", headers=admin_headers)

    def test_create_game_invalid_tag_id(
        self, client: httpx.Client, admin_headers: dict
    ):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Bad Tags", "tag_ids": [99999]},
        )
        assert resp.status_code == 400

    def test_update_preserves_tags_when_not_sent(
        self, client: httpx.Client, admin_headers: dict, tag_strategy: dict
    ):
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Keep Tags", "tag_ids": [tag_strategy["id"]]},
        )
        assert resp.status_code == 201
        game = resp.json()

        # Update name only, don't send tag_ids
        resp = client.put(
            f"/games/{game['id']}",
            headers=admin_headers,
            json={"name": "E2E Keep Tags Renamed"},
        )
        assert resp.status_code == 200
        assert len(resp.json()["tags"]) == 1
        # cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)


# ---- Filter by Tag ----


class TestGameFilterByTag:
    @pytest.fixture(autouse=True)
    def setup_games(
        self,
        client: httpx.Client,
        admin_headers: dict,
        tag_strategy: dict,
        tag_euro: dict,
        tag_party: dict,
    ):
        """Create test games with different tag combinations."""
        self.tag_strategy = tag_strategy
        self.tag_euro = tag_euro
        self.tag_party = tag_party

        # Game with Strategy + Euro
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Filter Alpha",
                "tag_ids": [tag_strategy["id"], tag_euro["id"]],
            },
        )
        assert resp.status_code == 201
        self.game_alpha = resp.json()

        # Game with Strategy only
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Filter Beta",
                "tag_ids": [tag_strategy["id"]],
            },
        )
        assert resp.status_code == 201
        self.game_beta = resp.json()

        # Game with Party only
        resp = client.post(
            "/games",
            headers=admin_headers,
            json={
                "name": "E2E Filter Gamma",
                "tag_ids": [tag_party["id"]],
            },
        )
        assert resp.status_code == 201
        self.game_gamma = resp.json()

        yield

        for g in [self.game_alpha, self.game_beta, self.game_gamma]:
            client.delete(f"/games/{g['id']}", headers=admin_headers)

    def test_filter_by_single_tag(self, client: httpx.Client):
        resp = client.get("/games", params={"tag": self.tag_strategy["name"]})
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" in names
        assert "E2E Filter Gamma" not in names

    def test_filter_by_multiple_tags_and_logic(self, client: httpx.Client):
        resp = client.get(
            "/games",
            params=[
                ("tag", self.tag_strategy["name"]),
                ("tag", self.tag_euro["name"]),
            ],
        )
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Alpha" in names
        assert "E2E Filter Beta" not in names

    def test_filter_by_tag_case_insensitive(self, client: httpx.Client):
        resp = client.get(
            "/games",
            params={"tag": self.tag_party["name"].lower()},
        )
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()["items"]]
        assert "E2E Filter Gamma" in names

    def test_filter_no_match(self, client: httpx.Client):
        resp = client.get("/games", params={"tag": "NonexistentTag"})
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 0

    def test_filter_combined_with_name(self, client: httpx.Client):
        resp = client.get(
            "/games",
            params={"tag": self.tag_strategy["name"], "name": "Alpha"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["name"] == "E2E Filter Alpha"

    def test_tag_deleted_removes_from_games(
        self, client: httpx.Client, admin_headers: dict
    ):
        # Create a temporary tag and assign it
        resp = client.post(
            "/tags", headers=admin_headers, json={"name": "E2E Temp Cascade"}
        )
        assert resp.status_code == 201
        temp_tag = resp.json()

        resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": "E2E Cascade Game", "tag_ids": [temp_tag["id"]]},
        )
        assert resp.status_code == 201
        game = resp.json()
        assert len(game["tags"]) == 1

        # Delete the tag
        resp = client.delete(f"/tags/{temp_tag['id']}", headers=admin_headers)
        assert resp.status_code == 204

        # Game should have no tags now
        resp = client.get(f"/games/{game['id']}")
        assert resp.status_code == 200
        assert len(resp.json()["tags"]) == 0

        # cleanup
        client.delete(f"/games/{game['id']}", headers=admin_headers)
