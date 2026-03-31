from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.stats import (
    GameStats,
    HIndexResponse,
    OverviewStats,
    PlayFrequencyEntry,
    PlayerScoreTrend,
    PlayerStats,
    PlayerWinRate,
    ScoreDistributionEntry,
    TopGame,
    WinStreakResponse,
)
from app.services.stats import (
    get_game_stats,
    get_h_index,
    get_overview_stats,
    get_play_frequency,
    get_player_score_trends,
    get_player_stats,
    get_player_win_rates,
    get_score_distribution,
    get_top_games,
    get_win_streaks,
)

router = APIRouter(prefix="/stats", tags=["statistics"])


@router.get("/overview", response_model=OverviewStats)
async def overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_overview_stats(db, current_user.id)


@router.get("/games/{game_id}", response_model=GameStats)
async def game_stats(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await get_game_stats(db, game_id, current_user.id)
    if result is None:
        raise HTTPException(404, "Game not found")
    return result


@router.get("/players/{player_id}", response_model=PlayerStats)
async def player_stats(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await get_player_stats(db, player_id, current_user.id)
    if result is None:
        raise HTTPException(404, "Player not found")
    return result


@router.get("/play-frequency", response_model=list[PlayFrequencyEntry])
async def play_frequency(
    period: str = Query("month", pattern="^(day|week|month)$"),
    months: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_play_frequency(db, period, months, current_user.id)


@router.get("/top-games", response_model=list[TopGame])
async def top_games(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_top_games(db, limit, current_user.id)


@router.get("/h-index", response_model=HIndexResponse)
async def h_index(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_h_index(db, current_user.id)


@router.get("/players/{player_id}/win-streaks", response_model=WinStreakResponse)
async def win_streaks(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await get_win_streaks(db, player_id, current_user.id)
    if result is None:
        raise HTTPException(404, "Player not found")
    return result


@router.get("/players/{player_id}/score-trends", response_model=list[PlayerScoreTrend])
async def score_trends(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_player_score_trends(db, player_id, current_user.id)


@router.get("/player-win-rates", response_model=list[PlayerWinRate])
async def player_win_rates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_player_win_rates(db, current_user.id)


@router.get("/games/{game_id}/score-distribution", response_model=list[ScoreDistributionEntry])
async def score_distribution(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_score_distribution(db, game_id, current_user.id)
