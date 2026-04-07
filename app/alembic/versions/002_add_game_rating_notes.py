"""Add rating and notes to games

Revision ID: 002
Revises: 001
Create Date: 2026-04-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("rating", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "notes")
    op.drop_column("games", "rating")
