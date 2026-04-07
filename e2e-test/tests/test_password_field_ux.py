"""E2e tests for password field UX — Gap 24.

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


class TestPasswordFieldUX:
    """Regression tests ensuring auth flow works after login page UX changes."""

    def test_login_with_correct_password(self, client: httpx.Client):
        """Auth endpoint accepts correct password and returns a JWT."""
        resp = client.post("/auth/token", json={"password": ADMIN_PASS})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_with_wrong_password(self, client: httpx.Client):
        """Auth endpoint rejects incorrect password with 401."""
        resp = client.post("/auth/token", json={"password": "wrong-password"})
        assert resp.status_code == 401
