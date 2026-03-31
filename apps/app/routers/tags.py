from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.game import Game, GameTag
from app.models.user import User
from app.schemas.game import GameTagCreate, GameTagRead

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[GameTagRead])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GameTag).where(GameTag.user_id == current_user.id).order_by(GameTag.name)
    )
    return result.scalars().all()


@router.post("/tags", response_model=GameTagRead, status_code=201)
async def create_tag(
    payload: GameTagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = GameTag(name=payload.name, color=payload.color, user_id=current_user.id)
    db.add(tag)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Tag already exists")
    await db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GameTag).where(GameTag.id == tag_id, GameTag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Tag not found")
    await db.delete(tag)
    await db.commit()


@router.post("/games/{game_id}/tags/{tag_id}", status_code=204)
async def assign_tag(
    game_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.tags))
        .where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    tag_result = await db.execute(select(GameTag).where(GameTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Tag not found")

    if tag not in game.tags:
        game.tags.append(tag)
        await db.commit()


@router.delete("/games/{game_id}/tags/{tag_id}", status_code=204)
async def remove_tag(
    game_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.tags))
        .where(Game.id == game_id, Game.user_id == current_user.id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    tag_result = await db.execute(select(GameTag).where(GameTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if tag and tag in game.tags:
        game.tags.remove(tag)
        await db.commit()
