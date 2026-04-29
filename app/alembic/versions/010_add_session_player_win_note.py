"""Add win_note to session_players

Revision ID: 010
Revises: 009
Create Date: 2026-04-29

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "session_players",
        sa.Column("win_note", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("session_players", "win_note")
