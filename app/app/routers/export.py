import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Game
from app.models.session import GameSession, Player, SessionPlayer
from app.schemas.export import ExportMeta, FullExport
from app.schemas.game import GameRead
from app.schemas.session import GameSessionRead, PlayerRead

router = APIRouter(tags=["export"])


@router.get("/export", response_model=FullExport)
async def export_json(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Full JSON export of all data for backup/migration."""
    games_result = await db.execute(
        select(Game).options(selectinload(Game.expansions)).order_by(Game.name)
    )
    games = list(games_result.scalars().unique().all())

    players_result = await db.execute(select(Player).order_by(Player.name))
    players = list(players_result.scalars().all())

    sessions_result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .order_by(GameSession.played_at.desc())
    )
    sessions = list(sessions_result.scalars().unique().all())

    now = datetime.now(timezone.utc)
    export = FullExport(
        meta=ExportMeta(exported_at=now, version="0.1.0"),
        games=[GameRead.model_validate(g) for g in games],
        players=[PlayerRead.model_validate(p) for p in players],
        sessions=[GameSessionRead.model_validate(s) for s in sessions],
    )

    date_str = now.strftime("%Y-%m-%d")
    return JSONResponse(
        content=export.model_dump(mode="json"),
        headers={
            "Content-Disposition": f'attachment; filename="meeplesshelf-export-{date_str}.json"'
        },
    )


@router.get("/export/sessions/csv")
async def export_sessions_csv(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """CSV export of sessions with one row per player-session."""
    sessions_result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .order_by(GameSession.played_at.desc())
    )
    sessions = list(sessions_result.scalars().unique().all())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "session_id",
        "game_name",
        "played_at",
        "notes",
        "expansions",
        "player_name",
        "total_score",
        "winner",
        "score_data",
    ])

    for session in sessions:
        game_name = session.game.name if session.game else ""
        played_at = session.played_at.isoformat() if session.played_at else ""
        notes = session.notes or ""
        expansions = "; ".join(exp.name for exp in session.expansions)

        for sp in session.players:
            writer.writerow([
                session.id,
                game_name,
                played_at,
                notes,
                expansions,
                sp.player.name,
                sp.total_score if sp.total_score is not None else "",
                sp.winner,
                json.dumps(sp.score_data) if sp.score_data else "",
            ])

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="meeplesshelf-sessions-{date_str}.csv"'
        },
    )
