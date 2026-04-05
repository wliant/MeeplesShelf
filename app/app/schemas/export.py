from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.game import GameRead
from app.schemas.session import GameSessionRead, PlayerRead


class ExportMeta(BaseModel):
    exported_at: datetime
    version: str


class FullExport(BaseModel):
    meta: ExportMeta
    games: list[GameRead]
    players: list[PlayerRead]
    sessions: list[GameSessionRead]
