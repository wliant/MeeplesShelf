"""BoardGameGeek integration endpoints."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Game
from app.schemas.bgg import BGGGameDetail, BGGSearchResponse
from app.services import bgg, storage
from app.services.bgg import BGGNotConfiguredError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["bgg"])

_CONTENT_TYPE_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.get("/bgg/search", response_model=BGGSearchResponse)
async def bgg_search(
    query: str = Query(..., min_length=2, max_length=200),
    _: None = Depends(require_admin),
):
    """Search BoardGameGeek for games matching the query."""
    try:
        results = await bgg.search_games(query)
    except BGGNotConfiguredError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        logger.warning("BGG search failed: %s", exc)
        raise HTTPException(502, "BGG search unavailable") from exc
    return BGGSearchResponse(results=results[:25])


@router.get("/bgg/details/{bgg_id}", response_model=BGGGameDetail)
async def bgg_details(
    bgg_id: int,
    _: None = Depends(require_admin),
):
    """Fetch detailed game info from BoardGameGeek by BGG ID."""
    try:
        detail = await bgg.get_game_details(bgg_id)
    except BGGNotConfiguredError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        logger.warning("BGG details fetch failed: %s", exc)
        raise HTTPException(502, "BGG details unavailable") from exc
    if detail is None:
        raise HTTPException(404, "Game not found on BGG")
    return detail


@router.post("/bgg/import-image/{bgg_id}", status_code=200)
async def bgg_import_image(
    bgg_id: int,
    game_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Download cover image from BGG and store it for a local game."""
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    try:
        detail = await bgg.get_game_details(bgg_id)
    except BGGNotConfiguredError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        logger.warning("BGG details fetch for image failed: %s", exc)
        raise HTTPException(502, "Could not fetch BGG game details") from exc

    if not detail or not detail.image_url:
        raise HTTPException(404, "No image available on BGG for this game")

    try:
        img_bytes, content_type = await bgg.download_image(detail.image_url)
    except Exception as exc:
        logger.warning("BGG image download failed: %s", exc)
        raise HTTPException(502, "Could not download image from BGG") from exc

    if game.image_filename:
        await storage.delete_image(game.id, game.image_filename)

    ext = _CONTENT_TYPE_EXT.get(content_type, ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    await storage.upload_image(game.id, filename, img_bytes, content_type)
    game.image_filename = filename
    await db.commit()

    return {"image_url": storage.get_public_url(game.id, filename)}
