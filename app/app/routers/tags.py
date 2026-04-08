import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Tag
from app.schemas.tag import TagCreate, TagRead

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[TagRead])
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


@router.post("/tags", response_model=TagRead, status_code=201)
async def create_tag(
    payload: TagCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    existing = await db.execute(
        select(Tag).where(func.lower(Tag.name) == payload.name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "A tag with that name already exists")

    tag = Tag(name=payload.name)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    logger.info("Created tag id=%s name=%r", tag.id, tag.name)
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Tag not found")
    await db.delete(tag)
    await db.commit()
    logger.info("Deleted tag id=%s name=%r", tag_id, tag.name)
