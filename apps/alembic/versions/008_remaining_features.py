"""Add remaining feature columns: game_type, collection details, incomplete sessions,
tiebreaker, and activity events table

Revision ID: 008
Revises: 007
Create Date: 2026-03-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Game model: game_type classification
    op.add_column(
        "games",
        sa.Column(
            "game_type", sa.String(30),
            server_default="base_game", nullable=False,
        ),
    )

    # Game model: collection details
    op.add_column(
        "games", sa.Column("shelf_location", sa.String(255), nullable=True)
    )
    op.add_column(
        "games", sa.Column("acquisition_date", sa.Date(), nullable=True)
    )
    op.add_column(
        "games", sa.Column("acquisition_price", sa.Float(), nullable=True)
    )
    op.add_column(
        "games", sa.Column("condition", sa.String(20), nullable=True)
    )
    op.add_column(
        "games", sa.Column("lent_to", sa.String(255), nullable=True)
    )

    # GameSession model: incomplete flag and tiebreaker
    op.add_column(
        "game_sessions",
        sa.Column(
            "is_incomplete", sa.Boolean(),
            server_default="false", nullable=False,
        ),
    )
    op.add_column(
        "game_sessions",
        sa.Column("tiebreaker_winner_id", sa.Integer(), nullable=True),
    )

    # Activity events table
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column(
            "payload",
            sa.dialects.postgresql.JSONB(),
            server_default="{}",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_activity_events_user_id", "activity_events", ["user_id"]
    )
    op.create_index(
        "ix_activity_events_created_at", "activity_events", ["created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_activity_events_created_at", "activity_events")
    op.drop_index("ix_activity_events_user_id", "activity_events")
    op.drop_table("activity_events")

    op.drop_column("game_sessions", "tiebreaker_winner_id")
    op.drop_column("game_sessions", "is_incomplete")

    op.drop_column("games", "lent_to")
    op.drop_column("games", "condition")
    op.drop_column("games", "acquisition_price")
    op.drop_column("games", "acquisition_date")
    op.drop_column("games", "shelf_location")
    op.drop_column("games", "game_type")
