from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, model_validator


class PlayerCreate(BaseModel):
    name: str


class PlayerRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    avatar_url: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


class PlayerUpdate(BaseModel):
    avatar_url: str | None = None
    color: str | None = None


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
    duration_minutes: int | None = None
    is_cooperative: bool = False
    cooperative_result: str | None = None
    location: str | None = None

    @model_validator(mode="after")
    def validate_cooperative(self):
        if self.cooperative_result and not self.is_cooperative:
            raise ValueError("cooperative_result requires is_cooperative=True")
        if self.cooperative_result and self.cooperative_result not in ("win", "loss"):
            raise ValueError("cooperative_result must be 'win' or 'loss'")
        return self


class GameSessionUpdate(BaseModel):
    game_id: int
    played_at: datetime | None = None
    notes: str | None = None
    expansion_ids: list[int] = []
    players: list[SessionPlayerCreate] = []
    duration_minutes: int | None = None
    is_cooperative: bool = False
    cooperative_result: str | None = None
    location: str | None = None

    @model_validator(mode="after")
    def validate_cooperative(self):
        if self.cooperative_result and not self.is_cooperative:
            raise ValueError("cooperative_result requires is_cooperative=True")
        if self.cooperative_result and self.cooperative_result not in ("win", "loss"):
            raise ValueError("cooperative_result must be 'win' or 'loss'")
        return self


class GameSessionRead(BaseModel):
    id: int
    game_id: int
    game: GameBrief
    played_at: datetime
    notes: str | None
    created_at: datetime
    players: list[SessionPlayerRead]
    expansions: list[ExpansionBrief] = []
    duration_minutes: int | None = None
    is_cooperative: bool = False
    cooperative_result: str | None = None
    location: str | None = None
    photos: list[SessionPhotoRead] = []

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


class SessionPhotoCreate(BaseModel):
    url: str
    caption: str | None = None


class SessionPhotoRead(BaseModel):
    id: int
    session_id: int
    url: str
    caption: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSessionResponse(BaseModel):
    items: list[GameSessionRead]
    total: int
    offset: int
    limit: int
