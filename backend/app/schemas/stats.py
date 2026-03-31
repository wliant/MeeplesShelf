from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class OverviewStats(BaseModel):
    total_games: int
    total_sessions: int
    total_players: int
    total_play_time_minutes: int
    unique_games_played: int
    sessions_last_30_days: int


class GameStats(BaseModel):
    game_id: int
    game_name: str
    total_plays: int
    unique_players: int
    average_score: float | None
    highest_score: int | None
    last_played: datetime | None
    win_distribution: dict[str, int]


class PlayerStats(BaseModel):
    player_id: int
    player_name: str
    total_sessions: int
    total_wins: int
    win_rate: float
    favorite_game: str | None
    games_played: list[str]


class PlayFrequencyEntry(BaseModel):
    period: str
    count: int


class TopGame(BaseModel):
    game_id: int
    game_name: str
    play_count: int
    thumbnail_url: str | None
