from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.game import Expansion, Game
from app.models.session import GameSession, Player, SessionPhoto, SessionPlayer
from app.schemas.session import (
    GameSessionCreate,
    GameSessionRead,
    GameSessionUpdate,
    PaginatedSessionResponse,
    PlayerCreate,
    PlayerRead,
    PlayerUpdate,
    SessionPhotoCreate,
    SessionPhotoRead,
)
from app.services.scoring import calculate_total

router = APIRouter(tags=["sessions"])


# --- Players ---


@router.get("/players", response_model=list[PlayerRead])
async def list_players(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).order_by(Player.name))
    return result.scalars().all()


@router.post("/players", response_model=PlayerRead, status_code=201)
async def create_player(payload: PlayerCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Player).where(Player.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Player already exists")
    player = Player(name=payload.name)
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.put("/players/{player_id}", response_model=PlayerRead)
async def update_player(
    player_id: int, payload: PlayerUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(player, key, value)
    await db.commit()
    await db.refresh(player)
    return player


# --- Sessions ---

SESSION_LOAD_OPTIONS = [
    selectinload(GameSession.players).selectinload(SessionPlayer.player),
    selectinload(GameSession.game),
    selectinload(GameSession.expansions),
    selectinload(GameSession.photos),
]


@router.get("/sessions", response_model=PaginatedSessionResponse)
async def list_sessions(
    game_id: int | None = None,
    player_id: int | None = None,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = select(GameSession)
    if game_id is not None:
        base = base.where(GameSession.game_id == game_id)
    if player_id is not None:
        base = base.join(GameSession.players).where(
            SessionPlayer.player_id == player_id
        )
    if date_from is not None:
        base = base.where(
            GameSession.played_at >= datetime.combine(date_from, datetime.min.time())
        )
    if date_to is not None:
        base = base.where(
            GameSession.played_at
            <= datetime.combine(date_to, datetime.max.time()).replace(
                hour=23, minute=59, second=59
            )
        )

    # Count total
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    query = (
        base.options(*SESSION_LOAD_OPTIONS)
        .order_by(GameSession.played_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().unique().all()

    return {"items": items, "total": total, "offset": offset, "limit": limit}


def _build_session(payload) -> GameSession:
    return GameSession(
        game_id=payload.game_id,
        played_at=payload.played_at,
        notes=payload.notes,
        duration_minutes=payload.duration_minutes,
        is_cooperative=payload.is_cooperative,
        cooperative_result=payload.cooperative_result,
        location=payload.location,
    )


@router.post("/sessions", response_model=GameSessionRead, status_code=201)
async def create_session(
    payload: GameSessionCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Game).where(Game.id == payload.game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    session = _build_session(payload)

    if payload.expansion_ids:
        exp_result = await db.execute(
            select(Expansion).where(Expansion.id.in_(payload.expansion_ids))
        )
        session.expansions = list(exp_result.scalars().all())

    db.add(session)
    await db.flush()

    _add_players_with_scores(
        session, payload.players, game.scoring_spec, payload.is_cooperative, db
    )

    await db.commit()

    result = await db.execute(
        select(GameSession)
        .options(*SESSION_LOAD_OPTIONS)
        .where(GameSession.id == session.id)
    )
    return result.scalar_one()


@router.put("/sessions/{session_id}", response_model=GameSessionRead)
async def update_session(
    session_id: int,
    payload: GameSessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession)
        .options(selectinload(GameSession.players))
        .where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    game_result = await db.execute(
        select(Game).where(Game.id == payload.game_id)
    )
    game = game_result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    session.game_id = payload.game_id
    if payload.played_at is not None:
        session.played_at = payload.played_at
    session.notes = payload.notes
    session.duration_minutes = payload.duration_minutes
    session.is_cooperative = payload.is_cooperative
    session.cooperative_result = payload.cooperative_result
    session.location = payload.location

    if payload.expansion_ids is not None:
        exp_result = await db.execute(
            select(Expansion).where(Expansion.id.in_(payload.expansion_ids))
        )
        session.expansions = list(exp_result.scalars().all())

    for sp in session.players:
        await db.delete(sp)
    await db.flush()

    _add_players_with_scores(
        session, payload.players, game.scoring_spec, payload.is_cooperative, db
    )

    await db.commit()

    result = await db.execute(
        select(GameSession)
        .options(*SESSION_LOAD_OPTIONS)
        .where(GameSession.id == session.id)
    )
    return result.scalar_one()


@router.get("/sessions/{session_id}", response_model=GameSessionRead)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameSession)
        .options(*SESSION_LOAD_OPTIONS)
        .where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()


# --- Session Photos ---


@router.post(
    "/sessions/{session_id}/photos", response_model=SessionPhotoRead, status_code=201
)
async def add_session_photo(
    session_id: int, payload: SessionPhotoCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Session not found")
    photo = SessionPhoto(
        session_id=session_id, url=payload.url, caption=payload.caption
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/sessions/{session_id}/photos/{photo_id}", status_code=204)
async def delete_session_photo(
    session_id: int, photo_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SessionPhoto).where(
            SessionPhoto.id == photo_id, SessionPhoto.session_id == session_id
        )
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(404, "Photo not found")
    await db.delete(photo)
    await db.commit()


def _add_players_with_scores(session, players, scoring_spec, is_cooperative, db):
    max_score = None
    session_players = []

    for sp in players:
        total = (
            calculate_total(scoring_spec, sp.score_data) if scoring_spec else None
        )
        session_player = SessionPlayer(
            session_id=session.id,
            player_id=sp.player_id,
            score_data=sp.score_data,
            total_score=total,
        )
        session_players.append(session_player)
        if total is not None and (max_score is None or total > max_score):
            max_score = total

    for sp in session_players:
        if is_cooperative:
            sp.winner = False
        else:
            sp.winner = sp.total_score is not None and sp.total_score == max_score
        db.add(sp)
