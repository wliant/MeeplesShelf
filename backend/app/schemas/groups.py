from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.session import PlayerRead


class PlayerGroupCreate(BaseModel):
    name: str


class PlayerGroupRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlayerGroupWithMembers(BaseModel):
    id: int
    name: str
    created_at: datetime
    members: list[PlayerRead] = []

    model_config = {"from_attributes": True}
