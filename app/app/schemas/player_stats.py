from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.stats import ActivityMonth


class PlayerGameBreakdown(BaseModel):
    game_id: int
    game_name: str
    times_played: int
    wins: int
    win_rate: float
    avg_score: float | None
    best_score: int | None
    last_played: datetime | None


class PlayerRecentSession(BaseModel):
    session_id: int
    game_id: int
    game_name: str
    played_at: datetime
    total_score: int | None
    winner: bool


class PlayerProfileStats(BaseModel):
    player_id: int
    player_name: str
    created_at: datetime
    sessions_played: int
    wins: int
    win_rate: float
    favorite_game: str | None
    games: list[PlayerGameBreakdown]
    recent_sessions: list[PlayerRecentSession]
    activity: list[ActivityMonth]
