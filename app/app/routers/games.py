import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Expansion, Game, Tag, game_tags
from app.models.session import GameSession
from app.schemas.game import (
    ExpansionCreate,
    ExpansionRead,
    GameCreate,
    GameRead,
    GameUpdate,
)
from app.schemas.pagination import PaginatedResponse
from app.services import storage
from app.services.seed import SEED_GAMES

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_CONTENT_TYPE_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(tags=["games"])


async def _load_session_stats(
    db: AsyncSession, game_ids: list[int]
) -> dict[int, tuple[int, datetime | None]]:
    """Return {game_id: (session_count, last_played_at)} for the given IDs."""
    if not game_ids:
        return {}
    stmt = (
        select(
            GameSession.game_id,
            func.count(GameSession.id).label("session_count"),
            func.max(GameSession.played_at).label("last_played_at"),
        )
        .where(GameSession.game_id.in_(game_ids))
        .group_by(GameSession.game_id)
    )
    result = await db.execute(stmt)
    return {row.game_id: (row.session_count, row.last_played_at) for row in result.all()}


def _enrich_game(
    game: Game, stats: dict[int, tuple[int, datetime | None]]
) -> GameRead:
    game_read = GameRead.model_validate(game)
    count, last = stats.get(game.id, (0, None))
    game_read.session_count = count
    game_read.last_played_at = last
    if game.image_filename:
        game_read.image_url = storage.get_public_url(game.id, game.image_filename)
    return game_read


@router.get("/games", response_model=PaginatedResponse[GameRead])
async def list_games(
    name: str | None = None,
    tag: list[str] | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if name:
        conditions.append(Game.name.ilike(f"%{name}%"))
    if tag:
        for t in tag:
            subq = (
                select(game_tags.c.game_id)
                .join(Tag, game_tags.c.tag_id == Tag.id)
                .where(func.lower(Tag.name) == t.strip().lower())
            )
            conditions.append(Game.id.in_(subq))

    count_query = select(func.count()).select_from(Game)
    for cond in conditions:
        count_query = count_query.where(cond)
    total = (await db.execute(count_query)).scalar_one()

    query = (
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .order_by(Game.name)
    )
    for cond in conditions:
        query = query.where(cond)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    game_ids = [g.id for g in items]
    stats = await _load_session_stats(db, game_ids)
    enriched = [_enrich_game(g, stats) for g in items]
    return PaginatedResponse(items=enriched, total=total, skip=skip, limit=limit)


@router.post("/games", response_model=GameRead, status_code=201)
async def create_game(
    payload: GameCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    # Resolve tag_ids before creating game
    tags = []
    if payload.tag_ids:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(payload.tag_ids))
        )
        tags = list(result.scalars().all())
        if len(tags) != len(set(payload.tag_ids)):
            raise HTTPException(400, "One or more tag_ids do not exist")

    game = Game(
        name=payload.name,
        min_players=payload.min_players,
        max_players=payload.max_players,
        scoring_spec=payload.scoring_spec.model_dump() if payload.scoring_spec else None,
        rating=payload.rating,
        notes=payload.notes,
    )
    game.tags = tags
    db.add(game)
    await db.commit()
    await db.refresh(game, ["expansions", "tags"])
    return game


@router.get("/games/{game_id}", response_model=GameRead)
async def get_game(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    stats = await _load_session_stats(db, [game.id])
    return _enrich_game(game, stats)


@router.put("/games/{game_id}", response_model=GameRead)
async def update_game(
    game_id: int,
    payload: GameUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "scoring_spec" in update_data and update_data["scoring_spec"] is not None:
        update_data["scoring_spec"] = payload.scoring_spec.model_dump()

    # Handle tag_ids separately
    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if tag_ids is not None:
            if tag_ids:
                tag_result = await db.execute(
                    select(Tag).where(Tag.id.in_(tag_ids))
                )
                found_tags = list(tag_result.scalars().all())
                if len(found_tags) != len(set(tag_ids)):
                    raise HTTPException(400, "One or more tag_ids do not exist")
                game.tags = found_tags
            else:
                game.tags = []

    for key, value in update_data.items():
        setattr(game, key, value)

    await db.commit()
    # Re-query to get server-side updated_at and eager-load expansions + tags
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .where(Game.id == game_id)
    )
    return result.scalar_one()


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
    if game.image_filename:
        await storage.delete_image(game.id, game.image_filename)
    await db.delete(game)
    await db.commit()


# --- Image ---


@router.post("/games/{game_id}/image", response_model=GameRead)
async def upload_game_image(
    game_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Unsupported file type. Allowed: JPEG, PNG, WebP")

    contents = await file.read()
    if len(contents) > _MAX_IMAGE_SIZE:
        raise HTTPException(400, "File too large. Maximum size: 5MB")

    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    if game.image_filename:
        await storage.delete_image(game.id, game.image_filename)

    ext = _CONTENT_TYPE_EXT[file.content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    await storage.upload_image(game_id, filename, contents, file.content_type)

    game.image_filename = filename
    await db.commit()
    # Re-query to get server-side updated_at and eager-load expansions + tags
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.expansions), selectinload(Game.tags))
        .where(Game.id == game_id)
    )
    game = result.scalar_one()
    stats = await _load_session_stats(db, [game.id])
    return _enrich_game(game, stats)


@router.delete("/games/{game_id}/image", status_code=204)
async def delete_game_image(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")
    if not game.image_filename:
        raise HTTPException(404, "No image to delete")

    await storage.delete_image(game.id, game.image_filename)
    game.image_filename = None
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
