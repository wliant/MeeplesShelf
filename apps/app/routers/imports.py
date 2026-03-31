from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.game import Game
from app.models.session import GameSession, Player, SessionPlayer
from app.models.user import User
from app.schemas.imports import ImportPreviewResponse, ImportResultResponse
from app.services.importer import parse_bgstats_json, parse_csv_sessions

router = APIRouter(prefix="/import", tags=["import"])


async def _parse_upload(file: UploadFile, format: str) -> tuple[list[dict], list[str]]:
    content = (await file.read()).decode("utf-8")
    if format == "bgstats":
        return parse_bgstats_json(content)
    return parse_csv_sessions(content)


@router.post("/preview", response_model=ImportPreviewResponse)
async def import_preview(
    file: UploadFile = File(...),
    format: str = Query("csv", pattern="^(csv|bgstats)$"),
    _current_user: User = Depends(get_current_user),
):
    """Parse an import file and return a preview without saving."""
    rows, errors = await _parse_upload(file, format)
    return {"rows": rows, "total": len(rows), "errors": errors}


@router.post("/sessions", response_model=ImportResultResponse)
async def import_sessions(
    file: UploadFile = File(...),
    format: str = Query("csv", pattern="^(csv|bgstats)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import sessions from a CSV or BG Stats JSON file."""
    rows, parse_errors = await _parse_upload(file, format)

    imported = 0
    skipped = 0
    errors = list(parse_errors)

    for i, row in enumerate(rows):
        try:
            # Find or skip game
            result = await db.execute(
                select(Game).where(
                    Game.name == row["game_name"], Game.user_id == current_user.id
                )
            )
            game = result.scalar_one_or_none()
            if not game:
                # Auto-create game
                game = Game(name=row["game_name"], user_id=current_user.id)
                db.add(game)
                await db.flush()

            # Parse date
            played_at = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"):
                try:
                    played_at = datetime.strptime(row["date"], fmt)
                    break
                except ValueError:
                    continue
            if not played_at:
                errors.append(f"Row {i + 1}: invalid date '{row['date']}'")
                skipped += 1
                continue

            session = GameSession(
                game_id=game.id,
                user_id=current_user.id,
                played_at=played_at,
                duration_minutes=row.get("duration_minutes"),
                location=row.get("location"),
                notes=row.get("notes"),
            )
            db.add(session)
            await db.flush()

            # Create players and session players
            for player_name in row.get("players", []):
                result = await db.execute(
                    select(Player).where(
                        Player.name == player_name, Player.user_id == current_user.id
                    )
                )
                player = result.scalar_one_or_none()
                if not player:
                    player = Player(name=player_name, user_id=current_user.id)
                    db.add(player)
                    await db.flush()

                total_score = row.get("scores", {}).get(player_name)
                is_winner = row.get("winner") == player_name

                sp = SessionPlayer(
                    session_id=session.id,
                    player_id=player.id,
                    total_score=total_score,
                    winner=is_winner,
                )
                db.add(sp)

            imported += 1
        except Exception as e:
            errors.append(f"Row {i + 1}: {e}")
            skipped += 1

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors}
