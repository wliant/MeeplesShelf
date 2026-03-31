"""Add Phase 2 models: player profiles, session location/photos, player groups, game tags

Revision ID: 004
Revises: 003
Create Date: 2026-03-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Player profile columns ---
    op.add_column("players", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column("players", sa.Column("color", sa.String(7), nullable=True))

    # --- Session location ---
    op.add_column("game_sessions", sa.Column("location", sa.String(255), nullable=True))

    # --- Session photos ---
    op.create_table(
        "session_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("game_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_session_photos_session_id", "session_photos", ["session_id"])

    # --- Player groups ---
    op.create_table(
        "player_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_table(
        "player_group_members",
        sa.Column(
            "group_id",
            sa.Integer(),
            sa.ForeignKey("player_groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "player_id",
            sa.Integer(),
            sa.ForeignKey("players.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # --- Game tags ---
    op.create_table(
        "game_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("color", sa.String(7), server_default="#666666"),
    )
    op.create_table(
        "game_tag_assignments",
        sa.Column(
            "game_id",
            sa.Integer(),
            sa.ForeignKey("games.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            sa.ForeignKey("game_tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("game_tag_assignments")
    op.drop_table("game_tags")
    op.drop_table("player_group_members")
    op.drop_table("player_groups")
    op.drop_index("ix_session_photos_session_id", table_name="session_photos")
    op.drop_table("session_photos")
    op.drop_column("game_sessions", "location")
    op.drop_column("players", "color")
    op.drop_column("players", "avatar_url")
