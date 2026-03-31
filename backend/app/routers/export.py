import csv
import io
import json as json_lib

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.game import Game
from app.models.session import GameSession, SessionPlayer

router = APIRouter(prefix="/export", tags=["export"])


MAX_EXPORT_ROWS = 10000


@router.get("/collection")
async def export_collection(
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Game)
        .options(
            selectinload(Game.designers),
            selectinload(Game.publishers),
            selectinload(Game.categories),
            selectinload(Game.mechanics),
        )
        .order_by(Game.name)
        .limit(MAX_EXPORT_ROWS)
    )
    games = result.scalars().unique().all()

    if format == "json":
        data = [
            {
                "name": g.name,
                "min_players": g.min_players,
                "max_players": g.max_players,
                "year_published": g.year_published,
                "weight": g.weight,
                "collection_status": g.collection_status,
                "description": g.description,
                "min_playtime": g.min_playtime,
                "max_playtime": g.max_playtime,
                "designers": [d.name for d in g.designers],
                "publishers": [p.name for p in g.publishers],
                "categories": [c.name for c in g.categories],
                "mechanics": [m.name for m in g.mechanics],
            }
            for g in games
        ]
        content = json_lib.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=collection.json"},
        )

    # CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name", "Min Players", "Max Players", "Year Published", "Weight",
        "Status", "Playtime", "Designers", "Publishers", "Categories", "Mechanics",
    ])
    for g in games:
        playtime = f"{g.min_playtime}-{g.max_playtime}" if g.min_playtime else ""
        writer.writerow([
            g.name,
            g.min_players,
            g.max_players,
            g.year_published or "",
            g.weight or "",
            g.collection_status,
            playtime,
            "; ".join(d.name for d in g.designers),
            "; ".join(p.name for p in g.publishers),
            "; ".join(c.name for c in g.categories),
            "; ".join(m.name for m in g.mechanics),
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=collection.csv"},
    )


@router.get("/sessions")
async def export_sessions(
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.game),
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
        )
        .order_by(GameSession.played_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    sessions = result.scalars().unique().all()

    if format == "json":
        data = [
            {
                "date": s.played_at.strftime("%Y-%m-%d"),
                "game": s.game.name,
                "players": [
                    {
                        "name": sp.player.name,
                        "score": sp.total_score,
                        "winner": sp.winner,
                    }
                    for sp in s.players
                ],
                "duration_minutes": s.duration_minutes,
                "location": s.location,
                "notes": s.notes,
                "is_cooperative": s.is_cooperative,
                "cooperative_result": s.cooperative_result,
            }
            for s in sessions
        ]
        content = json_lib.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=sessions.json"},
        )

    # CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Game", "Players", "Winner", "Scores",
        "Duration (min)", "Location", "Notes",
    ])
    for s in sessions:
        players_str = "; ".join(sp.player.name for sp in s.players)
        winners = "; ".join(
            sp.player.name for sp in s.players if sp.winner
        ) or "-"
        scores = "; ".join(
            f"{sp.player.name}: {sp.total_score}" for sp in s.players if sp.total_score is not None
        )
        writer.writerow([
            s.played_at.strftime("%Y-%m-%d"),
            s.game.name,
            players_str,
            winners,
            scores,
            s.duration_minutes or "",
            s.location or "",
            s.notes or "",
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sessions.csv"},
    )
