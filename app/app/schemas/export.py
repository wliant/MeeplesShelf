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


class ImportResult(BaseModel):
    games_created: int = 0
    expansions_created: int = 0
    players_created: int = 0
    players_reused: int = 0
    tags_created: int = 0
    tags_reused: int = 0
    sessions_created: int = 0
