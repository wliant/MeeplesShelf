from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

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


class GameCreate(BaseModel):
    name: str
    min_players: int = 1
    max_players: int = 4
    scoring_spec: ScoringSpec | None = None


class GameUpdate(BaseModel):
    name: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    scoring_spec: ScoringSpec | None = None


class GameRead(BaseModel):
    id: int
    name: str
    min_players: int
    max_players: int
    scoring_spec: ScoringSpec | None = None
    created_at: datetime
    updated_at: datetime
    expansions: list[ExpansionRead] = []

    model_config = {"from_attributes": True}
