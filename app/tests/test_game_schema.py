from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.game import GameCreate, GameRead, GameUpdate


class TestGameCreateRating:
    def test_rating_none_is_valid(self):
        g = GameCreate(name="Test", rating=None)
        assert g.rating is None

    def test_rating_omitted_defaults_to_none(self):
        g = GameCreate(name="Test")
        assert g.rating is None

    def test_rating_1_is_valid(self):
        g = GameCreate(name="Test", rating=1)
        assert g.rating == 1

    def test_rating_10_is_valid(self):
        g = GameCreate(name="Test", rating=10)
        assert g.rating == 10

    def test_rating_5_is_valid(self):
        g = GameCreate(name="Test", rating=5)
        assert g.rating == 5

    def test_rating_0_is_rejected(self):
        with pytest.raises(ValidationError):
            GameCreate(name="Test", rating=0)

    def test_rating_11_is_rejected(self):
        with pytest.raises(ValidationError):
            GameCreate(name="Test", rating=11)

    def test_rating_negative_is_rejected(self):
        with pytest.raises(ValidationError):
            GameCreate(name="Test", rating=-1)


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


class TestGameUpdateRating:
    def test_rating_valid_range(self):
        g = GameUpdate(rating=7)
        assert g.rating == 7

    def test_rating_out_of_range_rejected(self):
        with pytest.raises(ValidationError):
            GameUpdate(rating=0)

    def test_rating_none_clears(self):
        g = GameUpdate(rating=None)
        assert g.rating is None


class TestGameReadSessionFields:
    _BASE = dict(
        id=1,
        name="Test",
        min_players=2,
        max_players=4,
        scoring_spec=None,
        rating=None,
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
