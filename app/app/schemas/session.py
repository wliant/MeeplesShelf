from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PlayerCreate(BaseModel):
    name: str


class PlayerUpdate(BaseModel):
    name: str


class PlayerRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlayerReadWithCount(BaseModel):
    id: int
    name: str
    created_at: datetime
    session_count: int

    model_config = {"from_attributes": True}


class SessionPlayerCreate(BaseModel):
    player_id: int
    score_data: dict[str, Any] = {}


class SessionPlayerRead(BaseModel):
    id: int
    player_id: int
    player: PlayerRead
    score_data: dict[str, Any]
    total_score: int | None
    winner: bool

    model_config = {"from_attributes": True}


class GameSessionCreate(BaseModel):
    game_id: int
    played_at: datetime | None = None
    notes: str | None = None
    expansion_ids: list[int] = []
    players: list[SessionPlayerCreate] = []


class GameSessionUpdate(BaseModel):
    played_at: datetime | None = None
    notes: str | None = None
    expansion_ids: list[int] = []
    players: list[SessionPlayerCreate] = []


class GameSessionRead(BaseModel):
    id: int
    game_id: int
    game: GameBrief
    played_at: datetime
    notes: str | None
    created_at: datetime
    players: list[SessionPlayerRead]
    expansions: list[ExpansionBrief] = []

    model_config = {"from_attributes": True}


class GameBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ExpansionBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# Rebuild models that use forward references
GameSessionRead.model_rebuild()
