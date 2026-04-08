from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.session import GameSession, Player, SessionPlayer
from app.schemas.player_stats import (
    PlayerGameBreakdown,
    PlayerProfileStats,
    PlayerRecentSession,
)
from app.schemas.stats import ActivityMonth
from app.services.stats import fill_month_gaps

router = APIRouter(tags=["players"])


@router.get("/players/{player_id}/stats", response_model=PlayerProfileStats)
async def player_profile_stats(
    player_id: int,
    db: AsyncSession = Depends(get_db),
):
    # 1. Player lookup
    player = (
        await db.execute(select(Player).where(Player.id == player_id))
    ).scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player_name = player.name
    player_created_at = player.created_at

    # 2. Overall stats
    count_expr = func.count(SessionPlayer.id)
    wins_expr = func.coalesce(
        func.sum(case((SessionPlayer.winner == True, 1), else_=0)),  # noqa: E712
        0,
    )
    row = (
        await db.execute(
            select(count_expr.label("sessions_played"), wins_expr.label("wins")).where(
                SessionPlayer.player_id == player_id
            )
        )
    ).one()
    sessions_played = row.sessions_played
    wins = row.wins
    win_rate = round(wins / sessions_played, 4) if sessions_played > 0 else 0.0

    # 3. Per-game breakdown
    game_count = func.count(func.distinct(GameSession.id))
    game_wins = func.coalesce(
        func.sum(case((SessionPlayer.winner == True, 1), else_=0)),  # noqa: E712
        0,
    )
    game_stmt = (
        select(
            Game.id.label("game_id"),
            Game.name.label("game_name"),
            game_count.label("times_played"),
            game_wins.label("wins"),
            func.avg(SessionPlayer.total_score).label("avg_score"),
            func.max(SessionPlayer.total_score).label("best_score"),
            func.max(GameSession.played_at).label("last_played"),
        )
        .select_from(SessionPlayer)
        .join(GameSession, GameSession.id == SessionPlayer.session_id)
        .join(Game, Game.id == GameSession.game_id)
        .where(SessionPlayer.player_id == player_id)
        .group_by(Game.id, Game.name)
        .order_by(game_count.desc(), Game.name)
    )
    game_rows = (await db.execute(game_stmt)).all()

    games = []
    for g in game_rows:
        gw = g.wins
        gtp = g.times_played
        games.append(
            PlayerGameBreakdown(
                game_id=g.game_id,
                game_name=g.game_name,
                times_played=gtp,
                wins=gw,
                win_rate=round(gw / gtp, 4) if gtp > 0 else 0.0,
                avg_score=round(float(g.avg_score), 1) if g.avg_score is not None else None,
                best_score=g.best_score,
                last_played=g.last_played,
            )
        )

    favorite_game = games[0].game_name if games else None

    # 4. Recent sessions
    recent_stmt = (
        select(
            GameSession.id.label("session_id"),
            Game.id.label("game_id"),
            Game.name.label("game_name"),
            GameSession.played_at,
            SessionPlayer.total_score,
            SessionPlayer.winner,
        )
        .select_from(SessionPlayer)
        .join(GameSession, GameSession.id == SessionPlayer.session_id)
        .join(Game, Game.id == GameSession.game_id)
        .where(SessionPlayer.player_id == player_id)
        .order_by(GameSession.played_at.desc())
        .limit(20)
    )
    recent_rows = (await db.execute(recent_stmt)).all()
    recent_sessions = [
        PlayerRecentSession(
            session_id=r.session_id,
            game_id=r.game_id,
            game_name=r.game_name,
            played_at=r.played_at,
            total_score=r.total_score,
            winner=r.winner,
        )
        for r in recent_rows
    ]

    # 5. Activity (last 12 months)
    months = 12
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 31)
    month_expr = func.to_char(GameSession.played_at, "YYYY-MM")
    activity_stmt = (
        select(
            month_expr.label("month"),
            func.count(func.distinct(GameSession.id)).label("session_count"),
        )
        .select_from(SessionPlayer)
        .join(GameSession, GameSession.id == SessionPlayer.session_id)
        .where(SessionPlayer.player_id == player_id, GameSession.played_at >= cutoff)
        .group_by(month_expr)
        .order_by(month_expr)
    )
    activity_rows = (await db.execute(activity_stmt)).all()
    raw_activity = [
        {"month": r.month, "session_count": r.session_count} for r in activity_rows
    ]
    filled = fill_month_gaps(raw_activity, months, today=date.today())
    activity = [ActivityMonth(**entry) for entry in filled]

    return PlayerProfileStats(
        player_id=player_id,
        player_name=player_name,
        created_at=player_created_at,
        sessions_played=sessions_played,
        wins=wins,
        win_rate=win_rate,
        favorite_game=favorite_game,
        games=games,
        recent_sessions=recent_sessions,
        activity=activity,
    )
