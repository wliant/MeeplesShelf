"""Add bgg_id column to games

Revision ID: 005
Revises: 004
Create Date: 2026-04-08

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("bgg_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_games_bgg_id",
        "games",
        ["bgg_id"],
        unique=True,
        postgresql_where=sa.text("bgg_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_games_bgg_id", table_name="games")
    op.drop_column("games", "bgg_id")
