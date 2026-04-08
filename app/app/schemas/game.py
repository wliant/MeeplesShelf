from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.scoring import ScoringSpec


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
    scoring_spec: ScoringSpec | None = None
    rating: int | None = None
    notes: str | None = None

    @field_validator("rating")
    @classmethod
    def check_rating(cls, v: int | None) -> int | None:
        return _validate_rating(v)


class GameUpdate(BaseModel):
    name: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    scoring_spec: ScoringSpec | None = None
    rating: int | None = None
    notes: str | None = None

    @field_validator("rating")
    @classmethod
    def check_rating(cls, v: int | None) -> int | None:
        return _validate_rating(v)


class GameRead(BaseModel):
    id: int
    name: str
    min_players: int
    max_players: int
    scoring_spec: ScoringSpec | None = None
    rating: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    expansions: list[ExpansionRead] = []
    session_count: int = 0
    last_played_at: datetime | None = None

    model_config = {"from_attributes": True}
