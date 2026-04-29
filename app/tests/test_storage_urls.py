"""Storage URL helpers — verify the in-app proxy URL shape."""

from app.config import settings
from app.services import storage


class TestGetPublicUrl:
    def test_uses_app_public_url_and_proxy_path(self):
        url = storage.get_public_url(42)
        assert url == f"{settings.public_url}/api/games/42/image"

    def test_url_does_not_leak_filename(self):
        url = storage.get_public_url(7)
        assert "/image" in url
        assert ".jpg" not in url
        assert ".png" not in url


class TestGetSessionImageUrl:
    def test_uses_app_public_url_and_proxy_path(self):
        url = storage.get_session_image_url(13, 99)
        assert url == f"{settings.public_url}/api/sessions/13/images/99"

    def test_url_does_not_leak_filename(self):
        url = storage.get_session_image_url(1, 2)
        assert ".jpg" not in url
        assert ".png" not in url
