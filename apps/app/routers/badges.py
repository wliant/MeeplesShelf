from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.badges import BadgeDefinition, UserBadge
from app.models.user import User
from app.services.badges import SEED_BADGES, evaluate_badges

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("")
async def list_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all badge definitions with user's earned status."""
    badges_result = await db.execute(
        select(BadgeDefinition).order_by(BadgeDefinition.id)
    )
    badges = badges_result.scalars().all()

    earned_result = await db.execute(
        select(UserBadge.badge_id, UserBadge.awarded_at).where(
            UserBadge.user_id == current_user.id
        )
    )
    earned_map = {row[0]: row[1] for row in earned_result.all()}

    return [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "earned": b.id in earned_map,
            "awarded_at": earned_map.get(b.id, None),
        }
        for b in badges
    ]


@router.post("/evaluate")
async def evaluate_user_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Evaluate and award any new badges for the current user."""
    newly_awarded = await evaluate_badges(db, current_user.id)
    await db.commit()
    return {"newly_awarded": newly_awarded}


@router.post("/seed", status_code=201)
async def seed_badges(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Seed badge definitions."""
    created = []
    for badge_data in SEED_BADGES:
        existing = await db.execute(
            select(BadgeDefinition).where(BadgeDefinition.name == badge_data["name"])
        )
        if existing.scalar_one_or_none():
            continue
        badge = BadgeDefinition(**badge_data)
        db.add(badge)
        created.append(badge_data["name"])
    await db.commit()
    return {"seeded": created}
