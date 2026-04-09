"""Add sealed to sessions, create session_images and score_reactions tables

Revision ID: 007
Revises: 006
Create Date: 2026-04-10

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "game_sessions",
        sa.Column("sealed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "game_sessions",
        sa.Column("sealed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "session_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("game_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "player_id",
            sa.Integer(),
            sa.ForeignKey("players.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_session_images_session_id", "session_images", ["session_id"])

    op.create_table(
        "score_reactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_player_id",
            sa.Integer(),
            sa.ForeignKey("session_players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "player_id",
            sa.Integer(),
            sa.ForeignKey("players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reaction", sa.String(10), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "session_player_id", "player_id", name="uq_score_reactions_sp_player"
        ),
    )


def downgrade() -> None:
    op.drop_table("score_reactions")
    op.drop_index("ix_session_images_session_id", table_name="session_images")
    op.drop_table("session_images")
    op.drop_column("game_sessions", "sealed_at")
    op.drop_column("game_sessions", "sealed")
