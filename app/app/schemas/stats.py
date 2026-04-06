from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class OverviewStats(BaseModel):
    total_games: int
    total_sessions: int
    total_players: int
    recent_sessions: int
    most_recent_session_date: datetime | None


class PlayerStats(BaseModel):
    player_id: int
    player_name: str
    sessions_played: int
    wins: int
    win_rate: float


class GameStats(BaseModel):
    game_id: int
    game_name: str
    times_played: int
    unique_players: int
    last_played: datetime | None


class ActivityMonth(BaseModel):
    month: str
    session_count: int
