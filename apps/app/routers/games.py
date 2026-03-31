from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.game import (
    Category,
    Designer,
    Expansion,
    Game,
    Mechanic,
    Publisher,
    game_tag_assignments,
)
from app.models.user import User
from app.schemas.game import (
    ExpansionCreate,
    ExpansionRead,
    GameBrief,
    GameCreate,
    GameRead,
    GameUpdate,
    PaginatedGameResponse,
)
from app.services.seed import SEED_GAMES

router = APIRouter(tags=["games"])

GAME_LOAD_OPTIONS = [
    selectinload(Game.expansions),
    selectinload(Game.designers),
    selectinload(Game.publishers),
    selectinload(Game.categories),
    selectinload(Game.mechanics),
    selectinload(Game.tags),
]


async def _get_or_create_entities(db: AsyncSession, model, names: list[str]):
    """Get existing entities by name or create new ones."""
    entities = []
    for name in names:
        name = name.strip()
        if not name:
            continue
        result = await db.execute(select(model).where(model.name == name))
        entity = result.scalar_one_or_none()
        if not entity:
            entity = model(name=name)
            db.add(entity)
            await db.flush()
        entities.append(entity)
    return entities


async def _apply_relationships(db: AsyncSession, game: Game, payload):
    """Apply designer/publisher/category/mechanic relationships if provided."""
    if payload.designer_names is not None:
        game.designers = await _get_or_create_entities(
            db, Designer, payload.designer_names
        )
    if payload.publisher_names is not None:
        game.publishers = await _get_or_create_entities(
            db, Publisher, payload.publisher_names
        )
    if payload.category_names is not None:
        game.categories = await _get_or_create_entities(
            db, Category, payload.category_names
        )
    if payload.mechanic_names is not None:
        game.mechanics = await _get_or_create_entities(
            db, Mechanic, payload.mechanic_names
        )


@router.get("/games", response_model=PaginatedGameResponse)
async def list_games(
    collection_status: str | None = None,
    search: str | None = None,
    tag_id: int | None = None,
    sort_by: str = Query("name", pattern="^(name|created_at|min_players)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(Game).where(Game.user_id == current_user.id)
    if collection_status:
        base = base.where(Game.collection_status == collection_status)
    if search:
        base = base.where(Game.name.ilike(f"%{search}%"))
    if tag_id is not None:
        base = base.join(game_tag_assignments).where(
            game_tag_assignments.c.tag_id == tag_id
        )

    # Count total (use distinct IDs to avoid inflation from joined relationships)
    count_sub = base.with_only_columns(Game.id).distinct().subquery()
    count_result = await db.execute(select(func.count()).select_from(count_sub))
    total = count_result.scalar_one()

    # Sort
    sort_column = {"name": Game.name, "created_at": Game.created_at, "min_players": Game.min_players}[sort_by]
    order = sort_column.desc() if sort_dir == "desc" else sort_column.asc()

    query = base.options(*GAME_LOAD_OPTIONS).order_by(order).offset(offset).limit(limit)
    result = await db.execute(query)
    items = result.scalars().unique().all()

    return {"items": items, "total": total, "offset": offset, "limit": limit}


@router.get("/games/options", response_model=list[GameBrief])
async def list_game_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game).where(Game.user_id == current_user.id).order_by(Game.name)
    )
    return result.unique().scalars().all()


@router.post("/games", response_model=GameRead, status_code=201)
async def create_game(
    payload: GameCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(
        exclude={"designer_names", "publisher_names", "category_names", "mechanic_names"}
    )
    if data.get("scoring_spec") is not None:
        data["scoring_spec"] = payload.scoring_spec.model_dump()
    game = Game(**data, user_id=current_user.id)
    db.add(game)
    await db.flush()
    # Eagerly load empty relationship collections to avoid lazy-load in async context
    await db.refresh(game, ["designers", "publishers", "categories", "mechanics", "tags"])

    await _apply_relationships(db, game, payload)

    await db.commit()
    await db.refresh(game, ["expansions", "designers", "publishers", "categories", "mechanics", "tags"])
    return game


@router.get("/games/{game_id}", response_model=GameRead)
async def get_game(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game)
        .options(*GAME_LOAD_OPTIONS)
        .where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.unique().scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    return game


@router.put("/games/{game_id}", response_model=GameRead)
async def update_game(
    game_id: int,
    payload: GameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game)
        .options(*GAME_LOAD_OPTIONS)
        .where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.unique().scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    update_data = payload.model_dump(
        exclude_unset=True,
        exclude={"designer_names", "publisher_names", "category_names", "mechanic_names"},
    )
    if "scoring_spec" in update_data and update_data["scoring_spec"] is not None:
        update_data["scoring_spec"] = payload.scoring_spec.model_dump()
    for key, value in update_data.items():
        setattr(game, key, value)

    await _apply_relationships(db, game, payload)

    await db.commit()
    result = await db.execute(
        select(Game).options(*GAME_LOAD_OPTIONS).where(Game.id == game_id)
    )
    return result.unique().scalar_one()


@router.patch("/games/{game_id}/favorite", response_model=GameRead)
async def toggle_favorite(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game)
        .options(*GAME_LOAD_OPTIONS)
        .where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.unique().scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    game.is_favorite = not game.is_favorite
    await db.commit()
    result2 = await db.execute(
        select(Game).options(*GAME_LOAD_OPTIONS).where(Game.id == game_id)
    )
    return result2.unique().scalar_one()


@router.delete("/games/{game_id}", status_code=204)
async def delete_game(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game).where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.unique().scalar_one_or_none()
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
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game).where(Game.id == game_id, Game.user_id == current_user.id)
    )
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    created = []
    for data in SEED_GAMES:
        existing = await db.execute(select(Game).where(Game.name == data["name"]))
        if existing.scalar_one_or_none():
            continue
        game = Game(**data, user_id=current_user.id)
        db.add(game)
        created.append(data["name"])
    await db.commit()
    return {"seeded": created}
