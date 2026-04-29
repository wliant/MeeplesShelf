"""Storage URL helpers — verify the in-app proxy URL shape."""

from app.services import storage


class TestGetPublicUrl:
    def test_returns_relative_proxy_path(self):
        assert storage.get_public_url(42) == "/api/games/42/image"

    def test_url_does_not_leak_filename(self):
        url = storage.get_public_url(7)
        assert "/image" in url
        assert ".jpg" not in url
        assert ".png" not in url


class TestGetSessionImageUrl:
    def test_returns_relative_proxy_path(self):
        assert storage.get_session_image_url(13, 99) == "/api/sessions/13/images/99"

    def test_url_does_not_leak_filename(self):
        url = storage.get_session_image_url(1, 2)
        assert ".jpg" not in url
        assert ".png" not in url
