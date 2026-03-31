from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.game import Category, Designer, Game, Mechanic, Publisher
from app.models.sync import BggSyncStatus
from app.models.user import User
from app.schemas.bgg import BGGGameDetails, BGGImportRequest, BGGSearchResult
from app.schemas.game import GameRead
from app.services.bgg import fetch_collection, get_bgg_details, search_bgg

router = APIRouter(prefix="/integrations", tags=["integrations"])

GAME_LOAD_OPTIONS = [
    selectinload(Game.expansions),
    selectinload(Game.designers),
    selectinload(Game.publishers),
    selectinload(Game.categories),
    selectinload(Game.mechanics),
]


async def _get_or_create(db, model, name: str):
    result = await db.execute(select(model).where(model.name == name))
    entity = result.scalar_one_or_none()
    if not entity:
        entity = model(name=name)
        db.add(entity)
        await db.flush()
    return entity


@router.get("/bgg/search", response_model=list[BGGSearchResult])
async def bgg_search(query: str = Query(..., min_length=2)):
    try:
        return await search_bgg(query)
    except Exception as e:
        raise HTTPException(502, f"BGG API error: {e}")


@router.get("/bgg/details/{bgg_id}", response_model=BGGGameDetails)
async def bgg_details(bgg_id: int):
    try:
        return await get_bgg_details(bgg_id)
    except Exception as e:
        raise HTTPException(502, f"BGG API error: {e}")


@router.post("/bgg/import", response_model=GameRead, status_code=201)
async def bgg_import(
    payload: BGGImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if already imported for this user
    result = await db.execute(
        select(Game)
        .options(*GAME_LOAD_OPTIONS)
        .where(Game.bgg_id == payload.bgg_id, Game.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()

    try:
        details = await get_bgg_details(payload.bgg_id)
    except Exception as e:
        raise HTTPException(502, f"BGG API error: {e}")

    if existing:
        game = existing
    else:
        game = Game(user_id=current_user.id)
        db.add(game)

    game.bgg_id = details["bgg_id"]
    game.name = details["name"]
    game.description = details["description"]
    game.image_url = details["image_url"]
    game.thumbnail_url = details["thumbnail_url"]
    game.min_players = details["min_players"] or 1
    game.max_players = details["max_players"] or 4
    game.min_playtime = details["min_playtime"]
    game.max_playtime = details["max_playtime"]
    game.year_published = details["year_published"]
    game.min_age = details["min_age"]
    game.weight = details["weight"]

    await db.flush()

    game.designers = [
        await _get_or_create(db, Designer, n) for n in details["designers"]
    ]
    game.publishers = [
        await _get_or_create(db, Publisher, n) for n in details["publishers"]
    ]
    game.categories = [
        await _get_or_create(db, Category, n) for n in details["categories"]
    ]
    game.mechanics = [
        await _get_or_create(db, Mechanic, n) for n in details["mechanics"]
    ]

    await db.commit()
    await db.refresh(
        game,
        ["expansions", "designers", "publishers", "categories", "mechanics"],
    )
    return game


@router.post("/bgg/import-collection")
async def bgg_import_collection(
    bgg_username: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import a user's entire BGG collection by username."""
    try:
        collection = await fetch_collection(bgg_username)
    except Exception as e:
        raise HTTPException(502, f"BGG API error: {e}")

    imported = 0
    skipped = 0
    updated = 0

    for entry in collection:
        # Check if game already exists for this user
        result = await db.execute(
            select(Game).where(
                Game.bgg_id == entry["bgg_id"], Game.user_id == current_user.id
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Only fill in empty fields (conflict resolution: local wins)
            changed = False
            if not existing.image_url and entry.get("image_url"):
                existing.image_url = entry["image_url"]
                changed = True
            if not existing.thumbnail_url and entry.get("thumbnail_url"):
                existing.thumbnail_url = entry["thumbnail_url"]
                changed = True
            if not existing.year_published and entry.get("year_published"):
                existing.year_published = entry["year_published"]
                changed = True
            if changed:
                updated += 1
            else:
                skipped += 1
        else:
            game = Game(
                bgg_id=entry["bgg_id"],
                name=entry["name"],
                year_published=entry.get("year_published"),
                collection_status=entry.get("collection_status", "owned"),
                image_url=entry.get("image_url"),
                thumbnail_url=entry.get("thumbnail_url"),
                min_players=entry.get("min_players", 1),
                max_players=entry.get("max_players", 4),
                min_playtime=entry.get("min_playtime"),
                max_playtime=entry.get("max_playtime"),
                user_id=current_user.id,
            )
            db.add(game)
            imported += 1

    # Update sync status
    result = await db.execute(
        select(BggSyncStatus).where(BggSyncStatus.user_id == current_user.id)
    )
    sync_status = result.scalar_one_or_none()
    if not sync_status:
        sync_status = BggSyncStatus(
            user_id=current_user.id,
            bgg_username=bgg_username,
        )
        db.add(sync_status)

    sync_status.bgg_username = bgg_username
    sync_status.last_synced_at = datetime.now(UTC)
    sync_status.status = "completed"
    sync_status.games_imported = imported

    await db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "updated": updated,
        "total": len(collection),
    }
