from datetime import datetime, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.session import GameSession, Player, SessionPlayer


async def get_overview_stats(db: AsyncSession, user_id: int) -> dict:
    total_games = (
        await db.execute(select(func.count(Game.id)).where(Game.user_id == user_id))
    ).scalar() or 0
    total_sessions = (
        await db.execute(
            select(func.count(GameSession.id)).where(GameSession.user_id == user_id)
        )
    ).scalar() or 0
    total_players = (
        await db.execute(
            select(func.count(Player.id)).where(Player.user_id == user_id)
        )
    ).scalar() or 0
    total_play_time = (
        await db.execute(
            select(func.coalesce(func.sum(GameSession.duration_minutes), 0)).where(
                GameSession.user_id == user_id
            )
        )
    ).scalar() or 0
    unique_games_played = (
        await db.execute(
            select(func.count(distinct(GameSession.game_id))).where(
                GameSession.user_id == user_id
            )
        )
    ).scalar() or 0

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sessions_last_30 = (
        await db.execute(
            select(func.count(GameSession.id)).where(
                GameSession.played_at >= thirty_days_ago,
                GameSession.user_id == user_id,
            )
        )
    ).scalar() or 0

    return {
        "total_games": total_games,
        "total_sessions": total_sessions,
        "total_players": total_players,
        "total_play_time_minutes": total_play_time,
        "unique_games_played": unique_games_played,
        "sessions_last_30_days": sessions_last_30,
    }


async def get_game_stats(db: AsyncSession, game_id: int, user_id: int) -> dict | None:
    game = (
        await db.execute(
            select(Game).where(Game.id == game_id, Game.user_id == user_id)
        )
    ).scalar_one_or_none()
    if not game:
        return None

    total_plays = (
        await db.execute(
            select(func.count(GameSession.id)).where(
                GameSession.game_id == game_id,
                GameSession.user_id == user_id,
            )
        )
    ).scalar() or 0

    unique_players = (
        await db.execute(
            select(func.count(distinct(SessionPlayer.player_id)))
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(GameSession.game_id == game_id, GameSession.user_id == user_id)
        )
    ).scalar() or 0

    score_stats = (
        await db.execute(
            select(
                func.avg(SessionPlayer.total_score),
                func.max(SessionPlayer.total_score),
            )
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(GameSession.game_id == game_id, GameSession.user_id == user_id)
            .where(SessionPlayer.total_score.is_not(None))
        )
    ).one_or_none()

    avg_score = round(float(score_stats[0]), 1) if score_stats and score_stats[0] else None
    highest = int(score_stats[1]) if score_stats and score_stats[1] else None

    last_played = (
        await db.execute(
            select(func.max(GameSession.played_at)).where(
                GameSession.game_id == game_id, GameSession.user_id == user_id
            )
        )
    ).scalar()

    # Win distribution
    win_rows = (
        await db.execute(
            select(Player.name, func.count(SessionPlayer.id))
            .join(Player, SessionPlayer.player_id == Player.id)
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(GameSession.game_id == game_id, GameSession.user_id == user_id)
            .where(SessionPlayer.winner.is_(True))
            .group_by(Player.name)
        )
    ).all()

    return {
        "game_id": game_id,
        "game_name": game.name,
        "total_plays": total_plays,
        "unique_players": unique_players,
        "average_score": avg_score,
        "highest_score": highest,
        "last_played": last_played,
        "win_distribution": {name: count for name, count in win_rows},
    }


async def get_player_stats(db: AsyncSession, player_id: int, user_id: int) -> dict | None:
    player = (
        await db.execute(
            select(Player).where(Player.id == player_id, Player.user_id == user_id)
        )
    ).scalar_one_or_none()
    if not player:
        return None

    total_sessions = (
        await db.execute(
            select(func.count(SessionPlayer.id))
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(
                SessionPlayer.player_id == player_id,
                GameSession.user_id == user_id,
            )
        )
    ).scalar() or 0

    total_wins = (
        await db.execute(
            select(func.count(SessionPlayer.id))
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(
                SessionPlayer.player_id == player_id,
                SessionPlayer.winner.is_(True),
                GameSession.user_id == user_id,
            )
        )
    ).scalar() or 0

    win_rate = round(total_wins / total_sessions, 3) if total_sessions > 0 else 0.0

    # Favorite game (most played)
    fav_row = (
        await db.execute(
            select(Game.name, func.count(GameSession.id).label("cnt"))
            .join(GameSession, Game.id == GameSession.game_id)
            .join(SessionPlayer, GameSession.id == SessionPlayer.session_id)
            .where(SessionPlayer.player_id == player_id, GameSession.user_id == user_id)
            .group_by(Game.name)
            .order_by(func.count(GameSession.id).desc())
            .limit(1)
        )
    ).one_or_none()

    games_played_rows = (
        await db.execute(
            select(distinct(Game.name))
            .join(GameSession, Game.id == GameSession.game_id)
            .join(SessionPlayer, GameSession.id == SessionPlayer.session_id)
            .where(SessionPlayer.player_id == player_id, GameSession.user_id == user_id)
        )
    ).scalars().all()

    return {
        "player_id": player_id,
        "player_name": player.name,
        "total_sessions": total_sessions,
        "total_wins": total_wins,
        "win_rate": win_rate,
        "favorite_game": fav_row[0] if fav_row else None,
        "games_played": list(games_played_rows),
    }


async def get_play_frequency(
    db: AsyncSession, period: str = "month", months: int = 12, user_id: int | None = None
) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(days=months * 30)
    trunc_fn = func.date_trunc(period, GameSession.played_at)

    query = (
        select(trunc_fn.label("period"), func.count(GameSession.id))
        .where(GameSession.played_at >= cutoff, GameSession.user_id == user_id)
        .group_by("period")
        .order_by("period")
    )
    rows = (await db.execute(query)).all()

    return [
        {"period": row[0].strftime("%Y-%m-%d"), "count": row[1]} for row in rows
    ]


async def get_h_index(db: AsyncSession, user_id: int) -> dict:
    """Compute the H-index: largest h where h games have been played h+ times."""
    rows = (
        await db.execute(
            select(
                Game.id,
                Game.name,
                func.count(GameSession.id).label("cnt"),
            )
            .join(GameSession, Game.id == GameSession.game_id)
            .where(GameSession.user_id == user_id)
            .group_by(Game.id, Game.name)
            .order_by(func.count(GameSession.id).desc())
        )
    ).all()

    h_index = 0
    contributing = []
    for i, row in enumerate(rows):
        if row[2] >= i + 1:
            h_index = i + 1
            contributing.append(
                {"game_id": row[0], "game_name": row[1], "play_count": row[2]}
            )
        else:
            break

    return {"h_index": h_index, "contributing_games": contributing}


async def get_win_streaks(db: AsyncSession, player_id: int, user_id: int) -> dict | None:
    """Compute current and longest win streak for a player."""
    player = (
        await db.execute(
            select(Player).where(Player.id == player_id, Player.user_id == user_id)
        )
    ).scalar_one_or_none()
    if not player:
        return None

    rows = (
        await db.execute(
            select(SessionPlayer.winner, GameSession.played_at)
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(
                SessionPlayer.player_id == player_id,
                GameSession.user_id == user_id,
            )
            .order_by(GameSession.played_at.asc())
        )
    ).all()

    current_streak = 0
    longest_streak = 0
    streak = 0
    for winner, _ in rows:
        if winner:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0
    current_streak = streak

    return {"current_streak": current_streak, "longest_streak": longest_streak}


async def get_player_win_rates(db: AsyncSession, user_id: int) -> list[dict]:
    """Get win rates for all players."""
    rows = (
        await db.execute(
            select(
                Player.id,
                Player.name,
                func.count(SessionPlayer.id).label("total"),
                func.count(
                    func.nullif(SessionPlayer.winner, False)
                ).label("wins"),
            )
            .join(SessionPlayer, Player.id == SessionPlayer.player_id)
            .where(Player.user_id == user_id)
            .group_by(Player.id, Player.name)
            .order_by(func.count(SessionPlayer.id).desc())
        )
    ).all()

    return [
        {
            "player_id": row[0],
            "player_name": row[1],
            "total_sessions": row[2],
            "wins": row[3],
            "win_rate": round(row[3] / row[2], 3) if row[2] > 0 else 0.0,
        }
        for row in rows
    ]


async def get_score_distribution(db: AsyncSession, game_id: int, user_id: int) -> list[dict]:
    """Get score distribution for a game (histogram data)."""
    rows = (
        await db.execute(
            select(SessionPlayer.total_score, func.count(SessionPlayer.id))
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .where(
                GameSession.game_id == game_id,
                GameSession.user_id == user_id,
            )
            .where(SessionPlayer.total_score.is_not(None))
            .group_by(SessionPlayer.total_score)
            .order_by(SessionPlayer.total_score)
        )
    ).all()

    return [{"score": row[0], "count": row[1]} for row in rows]


async def get_player_score_trends(db: AsyncSession, player_id: int, user_id: int) -> list[dict]:
    """Get per-game score trends for a player over time."""
    rows = (
        await db.execute(
            select(
                Game.name,
                GameSession.played_at,
                SessionPlayer.total_score,
            )
            .join(GameSession, SessionPlayer.session_id == GameSession.id)
            .join(Game, GameSession.game_id == Game.id)
            .where(
                SessionPlayer.player_id == player_id,
                SessionPlayer.total_score.is_not(None),
                GameSession.user_id == user_id,
            )
            .order_by(GameSession.played_at.asc())
        )
    ).all()

    # Group by game
    games: dict[str, list[dict]] = {}
    for game_name, played_at, score in rows:
        if game_name not in games:
            games[game_name] = []
        games[game_name].append(
            {"played_at": played_at.strftime("%Y-%m-%d"), "score": score}
        )

    return [
        {"game_name": name, "data_points": points}
        for name, points in games.items()
    ]


async def get_top_games(db: AsyncSession, limit: int = 10, user_id: int | None = None) -> list[dict]:
    rows = (
        await db.execute(
            select(
                Game.id,
                Game.name,
                func.count(GameSession.id).label("cnt"),
                Game.thumbnail_url,
            )
            .join(GameSession, Game.id == GameSession.game_id)
            .where(GameSession.user_id == user_id)
            .group_by(Game.id, Game.name, Game.thumbnail_url)
            .order_by(func.count(GameSession.id).desc())
            .limit(limit)
        )
    ).all()

    return [
        {
            "game_id": row[0],
            "game_name": row[1],
            "play_count": row[2],
            "thumbnail_url": row[3],
        }
        for row in rows
    ]
