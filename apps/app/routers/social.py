from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.game import Game
from app.models.social import ActivityEvent, Friendship, SharedCollection
from app.models.user import User
from app.schemas.social import (
    ActivityEventResponse,
    FriendRequestCreate,
    PublicProfileResponse,
    SharedCollectionCreate,
    SharedCollectionResponse,
)

router = APIRouter(tags=["social"])


# --- Public profiles ---


@router.post("/profile/share", response_model=SharedCollectionResponse, status_code=201)
async def create_public_profile(
    payload: SharedCollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check slug uniqueness
    existing = await db.execute(
        select(SharedCollection).where(SharedCollection.public_slug == payload.public_slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Slug already taken")

    # Check if user already has a shared collection
    result = await db.execute(
        select(SharedCollection).where(SharedCollection.user_id == current_user.id)
    )
    shared = result.scalar_one_or_none()
    if shared:
        shared.public_slug = payload.public_slug
    else:
        shared = SharedCollection(user_id=current_user.id, public_slug=payload.public_slug)
        db.add(shared)

    await db.commit()
    await db.refresh(shared)
    return shared


@router.get("/profile/{slug}", response_model=PublicProfileResponse)
async def get_public_profile(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SharedCollection).where(SharedCollection.public_slug == slug)
    )
    shared = result.scalar_one_or_none()
    if not shared:
        raise HTTPException(404, "Profile not found")

    user = (await db.execute(select(User).where(User.id == shared.user_id))).scalar_one()

    games_result = await db.execute(
        select(Game).where(Game.user_id == shared.user_id).order_by(Game.name)
    )
    games = games_result.scalars().all()

    return {
        "display_name": user.display_name,
        "games": [
            {
                "name": g.name,
                "year_published": g.year_published,
                "collection_status": g.collection_status,
                "thumbnail_url": g.thumbnail_url,
            }
            for g in games
        ],
    }


# --- Friends ---


@router.post("/friends/request", status_code=201)
async def send_friend_request(
    payload: FriendRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friend = (
        await db.execute(select(User).where(User.email == payload.friend_email))
    ).scalar_one_or_none()
    if not friend:
        raise HTTPException(404, "User not found")
    if friend.id == current_user.id:
        raise HTTPException(400, "Cannot add yourself as a friend")

    # Check if already friends
    existing = await db.execute(
        select(Friendship).where(
            Friendship.user_id == current_user.id, Friendship.friend_id == friend.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Friend request already exists")

    friendship = Friendship(user_id=current_user.id, friend_id=friend.id)
    db.add(friendship)
    await db.commit()
    return {"status": "request_sent"}


@router.get("/friends")
async def list_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            ),
            Friendship.status == "accepted",
        )
    )
    friendships = result.scalars().all()

    friends = []
    for f in friendships:
        friend_id = f.friend_id if f.user_id == current_user.id else f.user_id
        friend = (await db.execute(select(User).where(User.id == friend_id))).scalar_one()
        friends.append({
            "id": f.id,
            "friend_id": friend.id,
            "friend_name": friend.display_name,
            "status": f.status,
        })

    return friends


@router.get("/friends/pending")
async def list_pending_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    requests = result.scalars().all()

    pending = []
    for f in requests:
        requester = (
            await db.execute(select(User).where(User.id == f.user_id))
        ).scalar_one()
        pending.append({
            "id": f.id,
            "from_user_id": requester.id,
            "from_user_name": requester.display_name,
            "created_at": f.created_at.isoformat(),
        })

    return pending


@router.post("/friends/{friendship_id}/accept")
async def accept_friend_request(
    friendship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(404, "Friend request not found")

    friendship.status = "accepted"

    # Record activity events for both users
    requester = (await db.execute(select(User).where(User.id == friendship.user_id))).scalar_one()
    db.add(ActivityEvent(
        user_id=current_user.id,
        event_type="friend_added",
        payload={"friend_name": requester.display_name},
    ))
    db.add(ActivityEvent(
        user_id=friendship.user_id,
        event_type="friend_added",
        payload={"friend_name": current_user.display_name},
    ))

    await db.commit()
    return {"status": "accepted"}


@router.delete("/friends/{friendship_id}", status_code=204)
async def remove_friend(
    friendship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            ),
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(404, "Friendship not found")
    await db.delete(friendship)
    await db.commit()


# --- Activity Feed ---


@router.get("/friends/activity", response_model=list[ActivityEventResponse])
async def get_friend_activity(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get accepted friend IDs
    result = await db.execute(
        select(Friendship).where(
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            ),
            Friendship.status == "accepted",
        )
    )
    friendships = result.scalars().all()
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f.friend_id if f.user_id == current_user.id else f.user_id)

    if not friend_ids:
        return []

    # Fetch activity events from friends
    events_result = await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.user_id.in_(friend_ids))
        .order_by(ActivityEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    events = events_result.scalars().all()

    # Resolve user display names
    user_ids = {e.user_id for e in events}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        user_map = {u.id: u.display_name for u in users_result.scalars().all()}
    else:
        user_map = {}

    return [
        ActivityEventResponse(
            id=e.id,
            user_id=e.user_id,
            user_name=user_map.get(e.user_id, "Unknown"),
            event_type=e.event_type,
            payload=e.payload,
            created_at=e.created_at,
        )
        for e in events
    ]
