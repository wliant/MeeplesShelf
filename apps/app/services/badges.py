from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badges import BadgeDefinition, UserBadge
from app.models.game import Game
from app.models.session import GameSession
from app.models.social import ActivityEvent


async def evaluate_badges(db: AsyncSession, user_id: int) -> list[str]:
    """Evaluate and award badges for a user. Returns list of newly awarded badge names."""
    awarded = []

    # Get all badge definitions
    result = await db.execute(select(BadgeDefinition))
    badges = result.scalars().all()

    for badge in badges:
        # Check if already awarded
        existing = await db.execute(
            select(UserBadge).where(
                UserBadge.user_id == user_id, UserBadge.badge_id == badge.id
            )
        )
        if existing.scalar_one_or_none():
            continue

        criteria = badge.criteria_json
        earned = False

        if criteria.get("type") == "first_play":
            count = (
                await db.execute(
                    select(func.count(GameSession.id)).where(
                        GameSession.user_id == user_id
                    )
                )
            ).scalar()
            earned = count is not None and count >= 1

        elif criteria.get("type") == "collector":
            threshold = criteria.get("threshold", 10)
            count = (
                await db.execute(
                    select(func.count(Game.id)).where(Game.user_id == user_id)
                )
            ).scalar()
            earned = count is not None and count >= threshold

        elif criteria.get("type") == "marathon":
            threshold_minutes = criteria.get("minutes", 180)
            max_duration = (
                await db.execute(
                    select(func.max(GameSession.duration_minutes)).where(
                        GameSession.user_id == user_id
                    )
                )
            ).scalar()
            earned = max_duration is not None and max_duration >= threshold_minutes

        elif criteria.get("type") == "variety":
            threshold = criteria.get("threshold", 10)
            count = (
                await db.execute(
                    select(func.count(distinct(GameSession.game_id))).where(
                        GameSession.user_id == user_id
                    )
                )
            ).scalar()
            earned = count is not None and count >= threshold

        if earned:
            db.add(UserBadge(user_id=user_id, badge_id=badge.id))
            db.add(ActivityEvent(
                user_id=user_id,
                event_type="badge_earned",
                payload={"badge_name": badge.name},
            ))
            awarded.append(badge.name)

    if awarded:
        await db.flush()

    return awarded


SEED_BADGES = [
    {
        "name": "First Play",
        "description": "Log your first game session",
        "icon": "play_arrow",
        "criteria_json": {"type": "first_play"},
    },
    {
        "name": "Collector",
        "description": "Own 10 or more games",
        "icon": "collections",
        "criteria_json": {"type": "collector", "threshold": 10},
    },
    {
        "name": "Mega Collector",
        "description": "Own 50 or more games",
        "icon": "warehouse",
        "criteria_json": {"type": "collector", "threshold": 50},
    },
    {
        "name": "Marathon Gamer",
        "description": "Play a session lasting 3+ hours",
        "icon": "timer",
        "criteria_json": {"type": "marathon", "minutes": 180},
    },
    {
        "name": "Variety Player",
        "description": "Play 10 different games",
        "icon": "casino",
        "criteria_json": {"type": "variety", "threshold": 10},
    },
]
