from datetime import datetime, timezone

from app.schemas.game import GameCreate, GameRead, GameUpdate


class TestGameCreateNotes:
    def test_notes_none_is_valid(self):
        g = GameCreate(name="Test", notes=None)
        assert g.notes is None

    def test_notes_omitted_defaults_to_none(self):
        g = GameCreate(name="Test")
        assert g.notes is None

    def test_notes_with_text(self):
        g = GameCreate(name="Test", notes="Great game for family night")
        assert g.notes == "Great game for family night"


class TestGameReadSessionFields:
    _BASE = dict(
        id=1,
        name="Test",
        min_players=2,
        max_players=4,
        scoring_spec=None,
        notes=None,
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        expansions=[],
    )

    def test_session_count_defaults_to_zero(self):
        g = GameRead(**self._BASE)
        assert g.session_count == 0

    def test_last_played_at_defaults_to_none(self):
        g = GameRead(**self._BASE)
        assert g.last_played_at is None

    def test_session_fields_accept_values(self):
        ts = datetime(2025, 6, 15, 14, 0, 0, tzinfo=timezone.utc)
        g = GameRead(**self._BASE, session_count=5, last_played_at=ts)
        assert g.session_count == 5
        assert g.last_played_at == ts

    def test_image_url_defaults_to_none(self):
        g = GameRead(**self._BASE)
        assert g.image_url is None

    def test_image_url_accepts_string(self):
        g = GameRead(**self._BASE, image_url="/api/games/1/image")
        assert g.image_url == "/api/games/1/image"

    def test_bgg_id_defaults_to_none(self):
        g = GameRead(**self._BASE)
        assert g.bgg_id is None

    def test_bgg_id_accepts_value(self):
        g = GameRead(**self._BASE, bgg_id=13)
        assert g.bgg_id == 13


class TestGameCreateBggId:
    def test_bgg_id_defaults_to_none(self):
        g = GameCreate(name="Test")
        assert g.bgg_id is None

    def test_bgg_id_accepts_value(self):
        g = GameCreate(name="Test", bgg_id=13)
        assert g.bgg_id == 13

    def test_bgg_id_none_explicit(self):
        g = GameCreate(name="Test", bgg_id=None)
        assert g.bgg_id is None


class TestGameUpdateBggId:
    def test_bgg_id_defaults_to_none(self):
        g = GameUpdate()
        assert g.bgg_id is None

    def test_bgg_id_accepts_value(self):
        g = GameUpdate(bgg_id=42)
        assert g.bgg_id == 42
