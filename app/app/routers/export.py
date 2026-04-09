import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models.game import Expansion, Game, Tag
from app.models.session import GameSession, Player, SessionPlayer, session_expansions
from app.schemas.export import ExportMeta, FullExport, ImportResult
from app.schemas.game import GameRead
from app.schemas.session import GameSessionRead, PlayerRead
from app.services.scoring import calculate_total, merge_scoring_spec

router = APIRouter(tags=["export"])


@router.get("/export", response_model=FullExport)
async def export_json(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Full JSON export of all data for backup/migration."""
    games_result = await db.execute(
        select(Game).options(selectinload(Game.expansions)).order_by(Game.name)
    )
    games = list(games_result.scalars().unique().all())

    players_result = await db.execute(select(Player).order_by(Player.name))
    players = list(players_result.scalars().all())

    sessions_result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .order_by(GameSession.played_at.desc())
    )
    sessions = list(sessions_result.scalars().unique().all())

    now = datetime.now(timezone.utc)
    export = FullExport(
        meta=ExportMeta(exported_at=now, version="0.1.0"),
        games=[GameRead.model_validate(g) for g in games],
        players=[PlayerRead.model_validate(p) for p in players],
        sessions=[GameSessionRead.model_validate(s) for s in sessions],
    )

    date_str = now.strftime("%Y-%m-%d")
    return JSONResponse(
        content=export.model_dump(mode="json"),
        headers={
            "Content-Disposition": f'attachment; filename="meeplesshelf-export-{date_str}.json"'
        },
    )


@router.get("/export/sessions/csv")
async def export_sessions_csv(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """CSV export of sessions with one row per player-session."""
    sessions_result = await db.execute(
        select(GameSession)
        .options(
            selectinload(GameSession.players).selectinload(SessionPlayer.player),
            selectinload(GameSession.game),
            selectinload(GameSession.expansions),
        )
        .order_by(GameSession.played_at.desc())
    )
    sessions = list(sessions_result.scalars().unique().all())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "session_id",
        "game_name",
        "played_at",
        "notes",
        "expansions",
        "player_name",
        "total_score",
        "winner",
        "score_data",
    ])

    for session in sessions:
        game_name = session.game.name if session.game else ""
        played_at = session.played_at.isoformat() if session.played_at else ""
        notes = session.notes or ""
        expansions = "; ".join(exp.name for exp in session.expansions)

        for sp in session.players:
            writer.writerow([
                session.id,
                game_name,
                played_at,
                notes,
                expansions,
                sp.player.name,
                sp.total_score if sp.total_score is not None else "",
                sp.winner,
                json.dumps(sp.score_data) if sp.score_data else "",
            ])

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="meeplesshelf-sessions-{date_str}.csv"'
        },
    )


@router.post("/import", response_model=ImportResult)
async def import_json(
    data: FullExport,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Import a previously exported JSON backup."""
    if data.meta.version != "0.1.0":
        raise HTTPException(400, f"Unsupported export version: {data.meta.version}")

    result = ImportResult()

    # Phase 1: Merge/create players by name
    existing_players = {
        p.name: p
        for p in (await db.execute(select(Player))).scalars().all()
    }
    player_id_map: dict[int, int] = {}
    for p in data.players:
        if p.name in existing_players:
            player_id_map[p.id] = existing_players[p.name].id
            result.players_reused += 1
        else:
            new_player = Player(name=p.name)
            db.add(new_player)
            await db.flush()
            player_id_map[p.id] = new_player.id
            existing_players[p.name] = new_player
            result.players_created += 1

    # Phase 2: Merge/create tags by name (case-insensitive)
    existing_tags = {
        t.name.lower(): t
        for t in (await db.execute(select(Tag))).scalars().all()
    }
    tag_id_map: dict[int, int] = {}
    for game in data.games:
        for tag in game.tags:
            if tag.id in tag_id_map:
                continue
            lower = tag.name.lower()
            if lower in existing_tags:
                tag_id_map[tag.id] = existing_tags[lower].id
                result.tags_reused += 1
            else:
                new_tag = Tag(name=tag.name)
                db.add(new_tag)
                await db.flush()
                tag_id_map[tag.id] = new_tag.id
                existing_tags[lower] = new_tag
                result.tags_created += 1

    # Phase 3: Create games and expansions
    game_id_map: dict[int, int] = {}
    expansion_id_map: dict[int, int] = {}
    expansion_objects: dict[int, Expansion] = {}  # old_expansion_id -> Expansion ORM
    game_objects: dict[int, Game] = {}  # new_game_id -> Game ORM

    for g in data.games:
        spec_dict = g.scoring_spec.model_dump() if g.scoring_spec else None
        new_game = Game(
            name=g.name,
            min_players=g.min_players,
            max_players=g.max_players,
            scoring_spec=spec_dict,
            rating=g.rating,
            notes=g.notes,
            bgg_id=g.bgg_id,
        )
        # Resolve tags
        resolved_tags = []
        for tag in g.tags:
            new_tag_id = tag_id_map[tag.id]
            tag_obj = existing_tags.get(tag.name.lower())
            if tag_obj:
                resolved_tags.append(tag_obj)
        new_game.tags = resolved_tags

        db.add(new_game)
        await db.flush()
        game_id_map[g.id] = new_game.id
        game_objects[new_game.id] = new_game
        result.games_created += 1

        for exp in g.expansions:
            patch_dict = exp.scoring_spec_patch.model_dump() if exp.scoring_spec_patch else None
            new_exp = Expansion(
                game_id=new_game.id,
                name=exp.name,
                scoring_spec_patch=patch_dict,
            )
            db.add(new_exp)
            await db.flush()
            expansion_id_map[exp.id] = new_exp.id
            expansion_objects[exp.id] = new_exp
            result.expansions_created += 1

    # Phase 4: Create sessions with score recalculation
    for s in data.sessions:
        new_game_id = game_id_map.get(s.game_id)
        if new_game_id is None:
            raise HTTPException(400, f"Session references unknown game_id {s.game_id}")

        new_session = GameSession(
            game_id=new_game_id,
            played_at=s.played_at,
            notes=s.notes,
        )
        db.add(new_session)
        await db.flush()

        # Link session expansions via junction table directly (avoid lazy-load trigger)
        active_expansions: list[Expansion] = []
        for exp_brief in s.expansions:
            exp_obj = expansion_objects.get(exp_brief.id)
            if exp_obj is not None:
                await db.execute(
                    session_expansions.insert().values(
                        session_id=new_session.id, expansion_id=exp_obj.id,
                    )
                )
                active_expansions.append(exp_obj)

        # Build effective scoring spec
        game_obj = game_objects[new_game_id]
        effective_spec = game_obj.scoring_spec
        if effective_spec and active_expansions:
            patches = [e.scoring_spec_patch for e in active_expansions]
            effective_spec = merge_scoring_spec(effective_spec, patches)

        # Create session players and compute scores
        session_players: list[SessionPlayer] = []
        max_score: int | None = None

        for sp in s.players:
            new_player_id = player_id_map.get(sp.player_id)
            if new_player_id is None:
                raise HTTPException(400, f"Session player references unknown player_id {sp.player_id}")

            total = None
            if effective_spec:
                total = calculate_total(effective_spec, sp.score_data)
                if max_score is None or total > max_score:
                    max_score = total

            new_sp = SessionPlayer(
                session_id=new_session.id,
                player_id=new_player_id,
                score_data=sp.score_data,
                total_score=total,
                winner=False,
            )
            db.add(new_sp)
            session_players.append(new_sp)

        # Determine winners
        if max_score is not None:
            for sp in session_players:
                if sp.total_score is not None and sp.total_score == max_score:
                    sp.winner = True

        result.sessions_created += 1

    await db.commit()
    return result
