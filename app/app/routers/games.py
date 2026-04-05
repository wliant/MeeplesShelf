from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Expansion, Game
from app.schemas.game import (
    ExpansionCreate,
    ExpansionRead,
    GameCreate,
    GameRead,
    GameUpdate,
)
from app.schemas.pagination import PaginatedResponse
from app.services.seed import SEED_GAMES

router = APIRouter(tags=["games"])


@router.get("/games", response_model=PaginatedResponse[GameRead])
async def list_games(
    name: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if name:
        conditions.append(Game.name.ilike(f"%{name}%"))

    count_query = select(func.count()).select_from(Game)
    for cond in conditions:
        count_query = count_query.where(cond)
    total = (await db.execute(count_query)).scalar_one()

    query = select(Game).options(selectinload(Game.expansions)).order_by(Game.name)
    for cond in conditions:
        query = query.where(cond)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/games", response_model=GameRead, status_code=201)
async def create_game(
    payload: GameCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    game = Game(
        name=payload.name,
        min_players=payload.min_players,
        max_players=payload.max_players,
        scoring_spec=payload.scoring_spec.model_dump() if payload.scoring_spec else None,
    )
    db.add(game)
    await db.commit()
    await db.refresh(game, ["expansions"])
    return game


@router.get("/games/{game_id}", response_model=GameRead)
async def get_game(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions))
        .where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    return game


@router.put("/games/{game_id}", response_model=GameRead)
async def update_game(
    game_id: int,
    payload: GameUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(Game).options(selectinload(Game.expansions)).where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "scoring_spec" in update_data and update_data["scoring_spec"] is not None:
        update_data["scoring_spec"] = payload.scoring_spec.model_dump()
    for key, value in update_data.items():
        setattr(game, key, value)

    await db.commit()
    await db.refresh(game, ["expansions"])
    return game


@router.delete("/games/{game_id}", status_code=204)
async def delete_game(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    await db.delete(game)
    await db.commit()


# --- Expansions ---


@router.post(
    "/games/{game_id}/expansions", response_model=ExpansionRead, status_code=201
)
async def add_expansion(
    game_id: int,
    payload: ExpansionCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Game not found")

    expansion = Expansion(
        game_id=game_id,
        name=payload.name,
        scoring_spec_patch=(
            payload.scoring_spec_patch.model_dump()
            if payload.scoring_spec_patch
            else None
        ),
    )
    db.add(expansion)
    await db.commit()
    await db.refresh(expansion)
    return expansion


@router.delete("/games/{game_id}/expansions/{expansion_id}", status_code=204)
async def delete_expansion(
    game_id: int,
    expansion_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(Expansion).where(
            Expansion.id == expansion_id, Expansion.game_id == game_id
        )
    )
    expansion = result.scalar_one_or_none()
    if not expansion:
        raise HTTPException(404, "Expansion not found")
    await db.delete(expansion)
    await db.commit()


# --- Seed ---


@router.post("/seed", status_code=201)
async def seed_games(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    created = []
    for data in SEED_GAMES:
        existing = await db.execute(select(Game).where(Game.name == data["name"]))
        if existing.scalar_one_or_none():
            continue
        game = Game(**data)
        db.add(game)
        created.append(data["name"])
    await db.commit()
    return {"seeded": created}
