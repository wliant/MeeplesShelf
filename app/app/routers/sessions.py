from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Expansion, Game
from app.models.session import GameSession, Player, SessionPlayer
from app.schemas.session import (
    GameSessionCreate,
    GameSessionRead,
    GameSessionUpdate,
    PlayerCreate,
    PlayerRead,
)
from app.services.scoring import calculate_total, merge_scoring_spec

router = APIRouter(tags=["sessions"])


# --- Players ---


@router.get("/players", response_model=list[PlayerRead])
async def list_players(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).order_by(Player.name))
    return result.scalars().all()


@router.post("/players", response_model=PlayerRead, status_code=201)
async def create_player(
    payload: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    existing = await db.execute(select(Player).where(Player.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Player already exists")
    player = Player(name=payload.name)
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


# --- Sessions ---


@router.get("/sessions", response_model=list[GameSessionRead])
async def list_sessions(
    game_id: int | None = None,
    player_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .order_by(GameSession.played_at.desc())
    )
    if game_id is not None:
        query = query.where(GameSession.game_id == game_id)
    if player_id is not None:
        query = query.where(
            GameSession.id.in_(
                select(SessionPlayer.session_id).where(
                    SessionPlayer.player_id == player_id
                )
            )
        )
    if date_from is not None:
        query = query.where(
            GameSession.played_at
            >= datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        )
    if date_to is not None:
        query = query.where(
            GameSession.played_at
            < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc)
        )
    result = await db.execute(query)
    return result.scalars().unique().all()


@router.post("/sessions", response_model=GameSessionRead, status_code=201)
async def create_session(
    payload: GameSessionCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    # Fetch game with scoring spec
    result = await db.execute(select(Game).where(Game.id == payload.game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(404, "Game not found")

    session = GameSession(
        game_id=payload.game_id,
        played_at=payload.played_at,
        notes=payload.notes,
    )

    # Attach expansions and collect scoring patches
    active_expansions: list[Expansion] = []
    if payload.expansion_ids:
        exp_result = await db.execute(
            select(Expansion).where(
                Expansion.id.in_(payload.expansion_ids),
                Expansion.game_id == payload.game_id,
            )
        )
        active_expansions = list(exp_result.scalars().all())
        if len(active_expansions) != len(payload.expansion_ids):
            raise HTTPException(
                400, "One or more expansion_ids do not belong to this game"
            )
        session.expansions = active_expansions

    db.add(session)
    await db.flush()

    # Add players with score calculation
    scoring_spec = game.scoring_spec
    if scoring_spec and active_expansions:
        patches = [exp.scoring_spec_patch for exp in active_expansions]
        scoring_spec = merge_scoring_spec(scoring_spec, patches)
    max_score = None
    session_players = []

    for sp in payload.players:
        total = (
            calculate_total(scoring_spec, sp.score_data)
            if scoring_spec
            else None
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

    # Mark winner(s)
    for sp in session_players:
        sp.winner = sp.total_score is not None and sp.total_score == max_score
        db.add(sp)

    await db.commit()

    # Re-fetch with all relationships
    result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .where(GameSession.id == session.id)
    )
    return result.scalar_one()


@router.get("/sessions/{session_id}", response_model=GameSessionRead)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.put("/sessions/{session_id}", response_model=GameSessionRead)
async def update_session(
    session_id: int,
    payload: GameSessionUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    # Fetch session with its game (need scoring_spec) and players (to clear)
    result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.game),
            selectinload(GameSession.players),
        )
        .where(GameSession.id == session_id)
    )
    session = result.unique().scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    # Update scalar fields
    if payload.played_at is not None:
        session.played_at = payload.played_at
    session.notes = payload.notes

    # Validate and replace expansions
    game = session.game
    active_expansions: list[Expansion] = []
    if payload.expansion_ids:
        exp_result = await db.execute(
            select(Expansion).where(
                Expansion.id.in_(payload.expansion_ids),
                Expansion.game_id == game.id,
            )
        )
        active_expansions = list(exp_result.scalars().all())
        if len(active_expansions) != len(payload.expansion_ids):
            raise HTTPException(
                400, "One or more expansion_ids do not belong to this game"
            )
    session.expansions = active_expansions

    # Remove old players and flush to avoid unique constraint violations
    session.players.clear()
    await db.flush()

    # Add players with score calculation
    scoring_spec = game.scoring_spec
    if scoring_spec and active_expansions:
        patches = [exp.scoring_spec_patch for exp in active_expansions]
        scoring_spec = merge_scoring_spec(scoring_spec, patches)

    max_score = None
    session_players = []

    for sp in payload.players:
        total = (
            calculate_total(scoring_spec, sp.score_data)
            if scoring_spec
            else None
        )
        session_player = SessionPlayer(
            session_id=session_id,
            player_id=sp.player_id,
            score_data=sp.score_data,
            total_score=total,
        )
        session_players.append(session_player)
        if total is not None and (max_score is None or total > max_score):
            max_score = total

    # Mark winner(s)
    for sp in session_players:
        sp.winner = sp.total_score is not None and sp.total_score == max_score
        db.add(sp)

    await db.commit()

    # Expire cached state so the re-fetch loads fresh relationships
    db.expire(session)

    # Re-fetch with all relationships (use session_id param, not session.id which would lazy-load)
    result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .where(GameSession.id == session_id)
    )
    return result.unique().scalar_one()


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()
