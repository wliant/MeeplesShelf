"""Add description, scoring_summary to games and create game_ratings table

Revision ID: 006
Revises: 005
Create Date: 2026-04-10

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("games", sa.Column("scoring_summary", sa.Text(), nullable=True))

    op.create_table(
        "game_ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "game_id",
            sa.Integer(),
            sa.ForeignKey("games.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "player_id",
            sa.Integer(),
            sa.ForeignKey("players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("game_id", "player_id", name="uq_game_ratings_game_player"),
    )


def downgrade() -> None:
    op.drop_table("game_ratings")
    op.drop_column("games", "scoring_summary")
    op.drop_column("games", "description")
