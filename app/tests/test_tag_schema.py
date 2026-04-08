from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.game import GameCreate, GameRead
from app.schemas.tag import TagCreate, TagRead


class TestTagCreate:
    def test_valid_name(self):
        t = TagCreate(name="Strategy")
        assert t.name == "Strategy"

    def test_name_stripped(self):
        t = TagCreate(name="  Strategy  ")
        assert t.name == "Strategy"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            TagCreate(name="")

    def test_whitespace_only_rejected(self):
        with pytest.raises(ValidationError):
            TagCreate(name="   ")

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            TagCreate(name="x" * 101)

    def test_max_length_accepted(self):
        t = TagCreate(name="x" * 100)
        assert len(t.name) == 100


class TestGameCreateWithTags:
    def test_tag_ids_defaults_to_empty(self):
        g = GameCreate(name="Test")
        assert g.tag_ids == []

    def test_tag_ids_accepts_list(self):
        g = GameCreate(name="Test", tag_ids=[1, 2, 3])
        assert g.tag_ids == [1, 2, 3]


class TestGameReadWithTags:
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

    def test_tags_defaults_to_empty(self):
        g = GameRead(**self._BASE)
        assert g.tags == []

    def test_tags_accepts_list(self):
        tag = TagRead(
            id=1,
            name="Strategy",
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        g = GameRead(**self._BASE, tags=[tag])
        assert len(g.tags) == 1
        assert g.tags[0].name == "Strategy"
