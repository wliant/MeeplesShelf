import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import AuthUser, require_admin, require_auth
from app.models.game import Expansion, Game
from app.models.session import GameSession, Player, ScoreReaction, SessionImage, SessionPlayer
from app.schemas.pagination import PaginatedResponse
from app.schemas.session import (
    GameSessionCreate,
    GameSessionRead,
    GameSessionUpdate,
    PlayerCreate,
    PlayerRead,
    PlayerReadWithCount,
    PlayerUpdate,
    ReactionSet,
    SessionImageRead,
    VALID_REACTIONS,
)
from app.services import storage
from app.services.scoring import calculate_total, merge_scoring_spec

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_CONTENT_TYPE_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(tags=["sessions"])


def _session_load_options():
    return [
        selectinload(GameSession.players)
        .selectinload(SessionPlayer.player),
        selectinload(GameSession.players)
        .selectinload(SessionPlayer.reactions)
        .selectinload(ScoreReaction.player),
        selectinload(GameSession.game),
        selectinload(GameSession.expansions),
        selectinload(GameSession.images)
        .selectinload(SessionImage.player),
    ]


def _populate_image_urls(session: GameSession) -> GameSession:
    """Set image_url on each SessionImage for serialization."""
    for img in session.images:
        img.image_url = storage.get_session_image_url(img.session_id, img.filename)
    return session


# --- Players ---


@router.get("/players", response_model=list[PlayerReadWithCount])
async def list_players(db: AsyncSession = Depends(get_db)):
    count_subq = (
        select(SessionPlayer.player_id, func.count().label("session_count"))
        .group_by(SessionPlayer.player_id)
        .subquery()
    )
    last_played_subq = (
        select(
            SessionPlayer.player_id,
            func.max(GameSession.played_at).label("last_played"),
        )
        .join(GameSession, GameSession.id == SessionPlayer.session_id)
        .group_by(SessionPlayer.player_id)
        .subquery()
    )
    result = await db.execute(
        select(
            Player,
            func.coalesce(count_subq.c.session_count, 0).label("session_count"),
            last_played_subq.c.last_played,
        )
        .outerjoin(count_subq, Player.id == count_subq.c.player_id)
        .outerjoin(last_played_subq, Player.id == last_played_subq.c.player_id)
        .order_by(Player.name)
    )
    return [
        PlayerReadWithCount(
            id=p.id, name=p.name, created_at=p.created_at,
            session_count=sc, last_played=lp,
        )
        for p, sc, lp in result.all()
    ]


@router.post("/players", response_model=PlayerRead, status_code=201)
async def create_player(
    payload: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthUser = Depends(require_auth),
):
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
    player_id: int,
    payload: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")
    existing = await db.execute(
        select(Player).where(Player.name == payload.name, Player.id != player_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "A player with that name already exists")
    player.name = payload.name
    await db.commit()
    await db.refresh(player)
    return player


@router.delete("/players/{player_id}", status_code=204)
async def delete_player(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")
    await db.delete(player)
    await db.commit()


# --- Sessions ---


@router.get("/sessions", response_model=PaginatedResponse[GameSessionRead])
async def list_sessions(
    game_id: int | None = None,
    player_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if game_id is not None:
        conditions.append(GameSession.game_id == game_id)
    if player_id is not None:
        conditions.append(
            GameSession.id.in_(
                select(SessionPlayer.session_id).where(
                    SessionPlayer.player_id == player_id
                )
            )
        )
    if date_from is not None:
        conditions.append(
            GameSession.played_at
            >= datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        )
    if date_to is not None:
        conditions.append(
            GameSession.played_at
            < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc)
        )

    count_query = select(func.count()).select_from(GameSession)
    for cond in conditions:
        count_query = count_query.where(cond)
    total = (await db.execute(count_query)).scalar_one()

    query = (
        select(GameSession)
        .options(*_session_load_options())
        .order_by(GameSession.played_at.desc())
    )
    for cond in conditions:
        query = query.where(cond)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = [_populate_image_urls(s) for s in result.scalars().unique().all()]

    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/sessions", response_model=GameSessionRead, status_code=201)
async def create_session(
    payload: GameSessionCreate,
    db: AsyncSession = Depends(get_db),
    _: AuthUser = Depends(require_auth),
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
        .options(*_session_load_options())
        .where(GameSession.id == session.id)
    )
    return _populate_image_urls(result.scalar_one())


@router.get("/sessions/{session_id}", response_model=GameSessionRead)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameSession)
        .options(*_session_load_options())
        .where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return _populate_image_urls(session)


@router.put("/sessions/{session_id}", response_model=GameSessionRead)
async def update_session(
    session_id: int,
    payload: GameSessionUpdate,
    db: AsyncSession = Depends(get_db),
    _: AuthUser = Depends(require_auth),
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
    if session.sealed:
        raise HTTPException(403, "Session is sealed and cannot be modified")

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
        .options(*_session_load_options())
        .where(GameSession.id == session_id)
    )
    return _populate_image_urls(result.unique().scalar_one())


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.unique().scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.sealed:
        raise HTTPException(403, "Session is sealed and cannot be deleted")
    await db.delete(session)
    await db.commit()


# --- Seal ---


@router.put("/sessions/{session_id}/seal", response_model=GameSessionRead)
async def toggle_seal_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.unique().scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    if session.sealed:
        session.sealed = False
        session.sealed_at = None
    else:
        session.sealed = True
        session.sealed_at = datetime.now(timezone.utc)

    await db.commit()

    result = await db.execute(
        select(GameSession)
        .options(*_session_load_options())
        .where(GameSession.id == session_id)
    )
    return _populate_image_urls(result.unique().scalar_one())


# --- Session Images ---


@router.post(
    "/sessions/{session_id}/images",
    response_model=SessionImageRead,
    status_code=201,
)
async def upload_session_image(
    session_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    auth: AuthUser = Depends(require_auth),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Unsupported file type. Allowed: JPEG, PNG, WebP")

    contents = await file.read()
    if len(contents) > _MAX_IMAGE_SIZE:
        raise HTTPException(400, "File too large. Maximum size: 5MB")

    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.sealed:
        raise HTTPException(403, "Session is sealed")

    ext = _CONTENT_TYPE_EXT[file.content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    await storage.upload_session_image(session_id, filename, contents, file.content_type)

    img = SessionImage(
        session_id=session_id,
        player_id=auth.player_id,
        filename=filename,
        original_filename=file.filename or filename,
        content_type=file.content_type,
    )
    db.add(img)
    await db.commit()
    await db.refresh(img, ["player"])
    img.image_url = storage.get_session_image_url(session_id, filename)
    return img


@router.delete("/sessions/{session_id}/images/{image_id}", status_code=204)
async def delete_session_image(
    session_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    auth: AuthUser = Depends(require_auth),
):
    result = await db.execute(
        select(SessionImage).where(
            SessionImage.id == image_id,
            SessionImage.session_id == session_id,
        )
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(404, "Image not found")

    # Check session sealed
    sess_result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = sess_result.scalar_one_or_none()
    if session and session.sealed:
        raise HTTPException(403, "Session is sealed")

    # Only uploader or admin can delete
    if auth.role != "admin" and auth.player_id != img.player_id:
        raise HTTPException(403, "Not allowed to delete this image")

    await storage.delete_session_image(session_id, img.filename)
    await db.delete(img)
    await db.commit()


# --- Score Reactions ---


@router.put("/sessions/{session_id}/players/{session_player_id}/reaction")
async def set_reaction(
    session_id: int,
    session_player_id: int,
    payload: ReactionSet,
    db: AsyncSession = Depends(get_db),
    auth: AuthUser = Depends(require_auth),
):
    if auth.player_id is None:
        raise HTTPException(403, "Only player accounts can react")
    if payload.reaction not in VALID_REACTIONS:
        raise HTTPException(400, f"Invalid reaction. Valid: {', '.join(VALID_REACTIONS)}")

    # Verify session_player belongs to session
    sp_result = await db.execute(
        select(SessionPlayer).where(
            SessionPlayer.id == session_player_id,
            SessionPlayer.session_id == session_id,
        )
    )
    if not sp_result.scalar_one_or_none():
        raise HTTPException(404, "Session player not found")

    existing = (
        await db.execute(
            select(ScoreReaction).where(
                ScoreReaction.session_player_id == session_player_id,
                ScoreReaction.player_id == auth.player_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        if existing.reaction == payload.reaction:
            # Toggle off
            await db.delete(existing)
            await db.commit()
            return {"removed": True}
        else:
            existing.reaction = payload.reaction
            await db.commit()
            await db.refresh(existing, ["player"])
            return ScoreReaction.__table__.columns.keys() and {
                "id": existing.id,
                "session_player_id": existing.session_player_id,
                "player_id": existing.player_id,
                "reaction": existing.reaction,
            }
    else:
        reaction = ScoreReaction(
            session_player_id=session_player_id,
            player_id=auth.player_id,
            reaction=payload.reaction,
        )
        db.add(reaction)
        await db.commit()
        await db.refresh(reaction, ["player"])
        return {
            "id": reaction.id,
            "session_player_id": reaction.session_player_id,
            "player_id": reaction.player_id,
            "reaction": reaction.reaction,
        }
