"""Add game metadata, collection status, and session enhancements

Revision ID: 003
Revises: 002
Create Date: 2026-03-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Game metadata columns ---
    op.add_column("games", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("games", sa.Column("image_url", sa.String(500), nullable=True))
    op.add_column("games", sa.Column("thumbnail_url", sa.String(500), nullable=True))
    op.add_column("games", sa.Column("min_playtime", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("max_playtime", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("min_age", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("weight", sa.Float(), nullable=True))
    op.add_column("games", sa.Column("year_published", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("bgg_id", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("user_rating", sa.Float(), nullable=True))

    # --- Collection status columns ---
    op.add_column(
        "games",
        sa.Column(
            "collection_status",
            sa.String(20),
            server_default="owned",
            nullable=False,
        ),
    )
    op.add_column(
        "games",
        sa.Column("is_favorite", sa.Boolean(), server_default="false", nullable=False),
    )

    op.create_index("ix_games_bgg_id", "games", ["bgg_id"], unique=True)
    op.create_index("ix_games_collection_status", "games", ["collection_status"])

    # --- Session enhancement columns ---
    op.add_column(
        "game_sessions", sa.Column("duration_minutes", sa.Integer(), nullable=True)
    )
    op.add_column(
        "game_sessions",
        sa.Column(
            "is_cooperative", sa.Boolean(), server_default="false", nullable=False
        ),
    )
    op.add_column(
        "game_sessions",
        sa.Column("cooperative_result", sa.String(10), nullable=True),
    )

    # --- Taxonomy tables ---
    for table_name in ("designers", "publishers", "categories", "mechanics"):
        op.create_table(
            table_name,
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False, unique=True),
            sa.Column("bgg_id", sa.Integer(), nullable=True),
        )

    # --- Association tables ---
    for assoc, entity in (
        ("game_designers", "designers"),
        ("game_publishers", "publishers"),
        ("game_categories", "categories"),
        ("game_mechanics", "mechanics"),
    ):
        op.create_table(
            assoc,
            sa.Column(
                "game_id",
                sa.Integer(),
                sa.ForeignKey("games.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                f"{entity[:-1]}_id",
                sa.Integer(),
                sa.ForeignKey(f"{entity}.id", ondelete="CASCADE"),
                primary_key=True,
            ),
        )


def downgrade() -> None:
    for assoc in (
        "game_mechanics",
        "game_categories",
        "game_publishers",
        "game_designers",
    ):
        op.drop_table(assoc)
    for table_name in ("mechanics", "categories", "publishers", "designers"):
        op.drop_table(table_name)

    op.drop_column("game_sessions", "cooperative_result")
    op.drop_column("game_sessions", "is_cooperative")
    op.drop_column("game_sessions", "duration_minutes")

    op.drop_index("ix_games_collection_status", table_name="games")
    op.drop_index("ix_games_bgg_id", table_name="games")
    op.drop_column("games", "is_favorite")
    op.drop_column("games", "collection_status")
    op.drop_column("games", "user_rating")
    op.drop_column("games", "bgg_id")
    op.drop_column("games", "year_published")
    op.drop_column("games", "weight")
    op.drop_column("games", "min_age")
    op.drop_column("games", "max_playtime")
    op.drop_column("games", "min_playtime")
    op.drop_column("games", "thumbnail_url")
    op.drop_column("games", "image_url")
    op.drop_column("games", "description")
