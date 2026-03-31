from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.session import Player, PlayerGroup
from app.schemas.groups import (
    PlayerGroupCreate,
    PlayerGroupWithMembers,
)

router = APIRouter(tags=["groups"])


@router.get("/groups", response_model=list[PlayerGroupWithMembers])
async def list_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlayerGroup)
        .options(selectinload(PlayerGroup.members))
        .order_by(PlayerGroup.name)
    )
    return result.scalars().unique().all()


@router.post("/groups", response_model=PlayerGroupWithMembers, status_code=201)
async def create_group(
    payload: PlayerGroupCreate, db: AsyncSession = Depends(get_db)
):
    group = PlayerGroup(name=payload.name)
    db.add(group)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Group already exists")
    await db.refresh(group, ["members"])
    return group


@router.put("/groups/{group_id}", response_model=PlayerGroupWithMembers)
async def update_group(
    group_id: int, payload: PlayerGroupCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PlayerGroup)
        .options(selectinload(PlayerGroup.members))
        .where(PlayerGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Group not found")
    group.name = payload.name
    await db.commit()
    await db.refresh(group, ["members"])
    return group


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlayerGroup).where(PlayerGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Group not found")
    await db.delete(group)
    await db.commit()


@router.post("/groups/{group_id}/members/{player_id}", status_code=204)
async def add_member(
    group_id: int, player_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PlayerGroup)
        .options(selectinload(PlayerGroup.members))
        .where(PlayerGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Group not found")

    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")

    if player not in group.members:
        group.members.append(player)
        await db.commit()


@router.delete("/groups/{group_id}/members/{player_id}", status_code=204)
async def remove_member(
    group_id: int, player_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PlayerGroup)
        .options(selectinload(PlayerGroup.members))
        .where(PlayerGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Group not found")

    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one_or_none()
    if player and player in group.members:
        group.members.remove(player)
        await db.commit()
