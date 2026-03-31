from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.stats import (
    GameStats,
    OverviewStats,
    PlayFrequencyEntry,
    PlayerStats,
    TopGame,
)
from app.services.stats import (
    get_game_stats,
    get_overview_stats,
    get_play_frequency,
    get_player_stats,
    get_top_games,
)

router = APIRouter(prefix="/stats", tags=["statistics"])


@router.get("/overview", response_model=OverviewStats)
async def overview(db: AsyncSession = Depends(get_db)):
    return await get_overview_stats(db)


@router.get("/games/{game_id}", response_model=GameStats)
async def game_stats(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await get_game_stats(db, game_id)
    if result is None:
        raise HTTPException(404, "Game not found")
    return result


@router.get("/players/{player_id}", response_model=PlayerStats)
async def player_stats(player_id: int, db: AsyncSession = Depends(get_db)):
    result = await get_player_stats(db, player_id)
    if result is None:
        raise HTTPException(404, "Player not found")
    return result


@router.get("/play-frequency", response_model=list[PlayFrequencyEntry])
async def play_frequency(
    period: str = Query("month", pattern="^(day|week|month)$"),
    months: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    return await get_play_frequency(db, period, months)


@router.get("/top-games", response_model=list[TopGame])
async def top_games(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await get_top_games(db, limit)
