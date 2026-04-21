from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator, model_validator

from app.schemas.scoring import ScoringSpec
from app.schemas.tag import TagRead


class ExpansionCreate(BaseModel):
    name: str
    scoring_spec_patch: ScoringSpec | None = None


class ExpansionRead(BaseModel):
    id: int
    game_id: int
    name: str
    scoring_spec_patch: ScoringSpec | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


def _validate_rating(v: int | None) -> int | None:
    if v is not None and not (1 <= v <= 10):
        raise ValueError("Rating must be between 1 and 10")
    return v


class GameCreate(BaseModel):
    name: str
    min_players: int = 1
    max_players: int = 4
    year_published: int | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    scoring_spec: ScoringSpec | None = None
    notes: str | None = None
    description: str | None = None
    scoring_summary: str | None = None
    categories: list[str] = []
    mechanics:  list[str] = []
    designers:  list[str] = []
    publishers: list[str] = []
    tag_ids: list[int] = []
    bgg_id: int | None = None


class GameUpdate(BaseModel):
    name: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    year_published: int | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    scoring_spec: ScoringSpec | None = None
    notes: str | None = None
    description: str | None = None
    scoring_summary: str | None = None
    categories: list[str] | None = None
    mechanics:  list[str] | None = None
    designers:  list[str] | None = None
    publishers: list[str] | None = None
    tag_ids: list[int] | None = None
    bgg_id: int | None = None


class GameRead(BaseModel):
    id: int
    name: str
    min_players: int
    max_players: int
    year_published: int | None = None
    min_playtime: int | None = None
    max_playtime: int | None = None
    scoring_spec: ScoringSpec | None = None
    notes: str | None = None
    description: str | None = None
    scoring_summary: str | None = None
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime
    expansions: list[ExpansionRead] = []
    tags: list[TagRead] = []
    categories: list[str] = []
    mechanics:  list[str] = []
    designers:  list[str] = []
    publishers: list[str] = []
    bgg_id: int | None = None
    session_count: int = 0
    last_played_at: datetime | None = None
    average_rating: float | None = None
    user_rating: int | None = None
    rating_count: int = 0

    @model_validator(mode="before")
    @classmethod
    def _coerce_null_lists(cls, data: object) -> object:
        if hasattr(data, "__dict__"):
            for field in ("categories", "mechanics", "designers", "publishers"):
                if getattr(data, field, None) is None:
                    object.__setattr__(data, field, [])
        elif isinstance(data, dict):
            for field in ("categories", "mechanics", "designers", "publishers"):
                if data.get(field) is None:
                    data[field] = []
        return data

    model_config = {"from_attributes": True}


class GameRatingCreate(BaseModel):
    rating: int

    @field_validator("rating")
    @classmethod
    def check_rating(cls, v: int) -> int:
        if not (1 <= v <= 10):
            raise ValueError("Rating must be between 1 and 10")
        return v


class GameRatingRead(BaseModel):
    id: int
    game_id: int
    player_id: int
    rating: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
