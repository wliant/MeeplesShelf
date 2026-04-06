from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.session import GameSession, Player, SessionPlayer
from app.schemas.stats import ActivityMonth, GameStats, OverviewStats, PlayerStats
from app.services.stats import fill_month_gaps

router = APIRouter(tags=["stats"])


@router.get("/stats/overview", response_model=OverviewStats)
async def stats_overview(db: AsyncSession = Depends(get_db)):
    total_games = (await db.execute(select(func.count()).select_from(Game))).scalar_one()
    total_sessions = (
        await db.execute(select(func.count()).select_from(GameSession))
    ).scalar_one()
    total_players = (
        await db.execute(select(func.count()).select_from(Player))
    ).scalar_one()

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_sessions = (
        await db.execute(
            select(func.count())
            .select_from(GameSession)
            .where(GameSession.played_at >= cutoff)
        )
    ).scalar_one()

    most_recent = (
        await db.execute(select(func.max(GameSession.played_at)))
    ).scalar_one()

    return OverviewStats(
        total_games=total_games,
        total_sessions=total_sessions,
        total_players=total_players,
        recent_sessions=recent_sessions,
        most_recent_session_date=most_recent,
    )


@router.get("/stats/players", response_model=list[PlayerStats])
async def stats_players(db: AsyncSession = Depends(get_db)):
    count_expr = func.count(SessionPlayer.id)
    wins_expr = func.coalesce(
        func.sum(case((SessionPlayer.winner == True, 1), else_=0)),  # noqa: E712
        0,
    )

    stmt = (
        select(
            Player.id,
            Player.name,
            count_expr.label("sessions_played"),
            wins_expr.label("wins"),
            case(
                (count_expr > 0, cast(wins_expr, Float) / cast(count_expr, Float)),
                else_=0.0,
            ).label("win_rate"),
        )
        .outerjoin(SessionPlayer, SessionPlayer.player_id == Player.id)
        .group_by(Player.id, Player.name)
        .order_by(
            case(
                (count_expr > 0, cast(wins_expr, Float) / cast(count_expr, Float)),
                else_=0.0,
            ).desc(),
            count_expr.desc(),
        )
    )

    result = await db.execute(stmt)
    return [
        PlayerStats(
            player_id=row.id,
            player_name=row.name,
            sessions_played=row.sessions_played,
            wins=row.wins,
            win_rate=round(row.win_rate, 4),
        )
        for row in result.all()
    ]


@router.get("/stats/games", response_model=list[GameStats])
async def stats_games(db: AsyncSession = Depends(get_db)):
    times_played = func.count(func.distinct(GameSession.id))
    unique_players = func.count(func.distinct(SessionPlayer.player_id))

    stmt = (
        select(
            Game.id,
            Game.name,
            times_played.label("times_played"),
            unique_players.label("unique_players"),
            func.max(GameSession.played_at).label("last_played"),
        )
        .outerjoin(GameSession, GameSession.game_id == Game.id)
        .outerjoin(SessionPlayer, SessionPlayer.session_id == GameSession.id)
        .group_by(Game.id, Game.name)
        .order_by(times_played.desc(), Game.name)
    )

    result = await db.execute(stmt)
    return [
        GameStats(
            game_id=row.id,
            game_name=row.name,
            times_played=row.times_played,
            unique_players=row.unique_players,
            last_played=row.last_played,
        )
        for row in result.all()
    ]


@router.get("/stats/activity", response_model=list[ActivityMonth])
async def stats_activity(
    months: int = Query(default=12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 31)
    month_expr = func.to_char(GameSession.played_at, "YYYY-MM")

    stmt = (
        select(
            month_expr.label("month"),
            func.count().label("session_count"),
        )
        .where(GameSession.played_at >= cutoff)
        .group_by(month_expr)
        .order_by(month_expr)
    )

    result = await db.execute(stmt)
    raw = [{"month": row.month, "session_count": row.session_count} for row in result.all()]

    filled = fill_month_gaps(raw, months, today=date.today())
    return [ActivityMonth(**entry) for entry in filled]
