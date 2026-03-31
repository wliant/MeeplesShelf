"""Add performance indexes

Revision ID: 002
Revises: 001
Create Date: 2026-03-31

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_game_sessions_game_id", "game_sessions", ["game_id"])
    op.create_index(
        "ix_game_sessions_played_at", "game_sessions", ["played_at"]
    )
    op.create_index(
        "ix_session_players_player_id", "session_players", ["player_id"]
    )
    op.create_index("ix_games_name", "games", ["name"])


def downgrade() -> None:
    op.drop_index("ix_games_name", table_name="games")
    op.drop_index("ix_session_players_player_id", table_name="session_players")
    op.drop_index("ix_game_sessions_played_at", table_name="game_sessions")
    op.drop_index("ix_game_sessions_game_id", table_name="game_sessions")
