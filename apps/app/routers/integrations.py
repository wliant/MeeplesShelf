from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.game import Category, Designer, Game, Mechanic, Publisher
from app.schemas.bgg import BGGGameDetails, BGGImportRequest, BGGSearchResult
from app.schemas.game import GameRead
from app.services.bgg import get_bgg_details, search_bgg

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
    payload: BGGImportRequest, db: AsyncSession = Depends(get_db)
):
    # Check if already imported
    result = await db.execute(
        select(Game)
        .options(*GAME_LOAD_OPTIONS)
        .where(Game.bgg_id == payload.bgg_id)
    )
    existing = result.scalar_one_or_none()

    try:
        details = await get_bgg_details(payload.bgg_id)
    except Exception as e:
        raise HTTPException(502, f"BGG API error: {e}")

    if existing:
        game = existing
    else:
        game = Game()
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
