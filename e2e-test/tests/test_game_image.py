"""E2e tests for game cover images — Gap 10.

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

_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)

_app_port = os.environ.get("APP_PORT", "8000")
BASE_URL = os.environ.get("E2E_BASE_URL", f"http://localhost:{_app_port}/api")
ADMIN_PASS = os.environ.get("APP_ADMIN_PASSWORD", "changeme")

# Minimal valid 1x1 red pixel JPEG (635 bytes)
_TINY_JPEG = bytes.fromhex(
    "ffd8ffe000104a46494600010100000100010000"
    "ffdb004300080606070605080707070909080a0c"
    "140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c"
    "20242e2720222c231c1c2837292c30313434341f"
    "27393d38323c2e333432ffdb004301090909"
    "0c0b0c180d0d1832211c213232323232323232"
    "32323232323232323232323232323232323232"
    "32323232323232323232323232323232323232"
    "3232323232ffc00011080001000103012200021101031101"
    "ffc4001f000001050101010101010000000000000000"
    "0102030405060708090a0bffc400b510000201"
    "0303020403050504040000017d01020300041105122131"
    "410613516107227114328191a1082342b1c11552d1f0"
    "243362e1133282090a161718191a25262728292a343536"
    "3738393a434445464748494a535455565758595a636465"
    "666768696a737475767778797a838485868788898a"
    "92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5"
    "b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9"
    "dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa"
    "ffc4001f010003010101010101010101000000000000"
    "0102030405060708090a0bffc400b51100020102"
    "0404030407050404000102770001020311040521310612"
    "415107226114328191a1082342b1c1155262d1f0243372"
    "e11382090a161718191a25262728292a34353637383"
    "93a434445464748494a535455565758595a6364656667"
    "68696a737475767778797a82838485868788898a929394"
    "95969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8"
    "b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3"
    "e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03"
    "0100021103110000013fe9a28a00ffd9"
)

# Minimal valid 1x1 PNG (67 bytes)
_TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001"
    "000000010802000000907753de0000000c49444154"
    "08d763f8cfc000000002000100e5b7eb4a00000000"
    "49454e44ae426082"
)


def _fetch_image(url: str) -> httpx.Response:
    """Fetch an image by its absolute URL (served by MinIO)."""
    with httpx.Client(timeout=10) as c:
        return c.get(url)


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
def game(client: httpx.Client, admin_headers: dict):
    """Create a disposable game for testing."""
    name = f"E2E Image Test {uuid.uuid4().hex[:8]}"
    resp = client.post(
        "/games",
        headers=admin_headers,
        json={"name": name, "min_players": 1, "max_players": 4},
    )
    assert resp.status_code == 201
    g = resp.json()
    yield g
    client.delete(f"/games/{g['id']}", headers=admin_headers)


class TestImageUpload:
    def test_upload_image_success(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["image_url"] is not None
        assert data["image_url"].startswith("http")
        assert data["image_url"].endswith(".jpg")

    def test_upload_png(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 200
        assert resp.json()["image_url"].endswith(".png")

    def test_upload_requires_admin(self, client, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        assert resp.status_code == 401

    def test_upload_invalid_file_type(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 400
        assert "Unsupported file type" in resp.json()["detail"]

    def test_upload_to_nonexistent_game(self, client, admin_headers):
        resp = client.post(
            "/games/999999/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        assert resp.status_code == 404

    def test_image_url_in_game_list(self, client, admin_headers, game):
        client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        resp = client.get("/games", params={"name": game["name"]})
        assert resp.status_code == 200
        items = resp.json()["items"]
        match = [g for g in items if g["id"] == game["id"]]
        assert len(match) == 1
        assert match[0]["image_url"] is not None

    def test_image_url_in_game_detail(self, client, admin_headers, game):
        client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        resp = client.get(f"/games/{game['id']}")
        assert resp.status_code == 200
        assert resp.json()["image_url"] is not None


class TestImageServing:
    def test_image_accessible_via_url(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        image_url = resp.json()["image_url"]
        img_resp = _fetch_image(image_url)
        assert img_resp.status_code == 200
        assert "image" in img_resp.headers.get("content-type", "")

    def test_image_accessible_without_auth(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        image_url = resp.json()["image_url"]
        # Fetch without any auth headers — S3 bucket has public-read policy
        img_resp = _fetch_image(image_url)
        assert img_resp.status_code == 200


class TestImageReplace:
    def test_replace_image(self, client, admin_headers, game):
        resp1 = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        url1 = resp1.json()["image_url"]

        resp2 = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.png", _TINY_PNG, "image/png")},
        )
        url2 = resp2.json()["image_url"]
        assert url1 != url2
        assert url2.endswith(".png")


class TestImageDelete:
    def test_delete_image(self, client, admin_headers, game):
        resp = client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        image_url = resp.json()["image_url"]

        del_resp = client.delete(
            f"/games/{game['id']}/image", headers=admin_headers
        )
        assert del_resp.status_code == 204

        detail = client.get(f"/games/{game['id']}")
        assert detail.json()["image_url"] is None

        img_resp = _fetch_image(image_url)
        assert img_resp.status_code in (404, 403)

    def test_delete_image_requires_admin(self, client, admin_headers, game):
        client.post(
            f"/games/{game['id']}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        resp = client.delete(f"/games/{game['id']}/image")
        assert resp.status_code == 401

    def test_delete_nonexistent_image(self, client, admin_headers, game):
        resp = client.delete(
            f"/games/{game['id']}/image", headers=admin_headers
        )
        assert resp.status_code == 404
        assert "No image" in resp.json()["detail"]


class TestGameDeletionCleansImage:
    def test_deleting_game_removes_image(self, client, admin_headers):
        name = f"E2E Delete Image {uuid.uuid4().hex[:8]}"
        create_resp = client.post(
            "/games",
            headers=admin_headers,
            json={"name": name, "min_players": 1, "max_players": 4},
        )
        assert create_resp.status_code == 201
        game_id = create_resp.json()["id"]

        upload_resp = client.post(
            f"/games/{game_id}/image",
            headers=admin_headers,
            files={"file": ("cover.jpg", _TINY_JPEG, "image/jpeg")},
        )
        image_url = upload_resp.json()["image_url"]

        client.delete(f"/games/{game_id}", headers=admin_headers)

        img_resp = _fetch_image(image_url)
        assert img_resp.status_code in (404, 403)
