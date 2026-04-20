"""Add year_published, min_playtime, max_playtime to games table

Revision ID: 008
Revises: 007
Create Date: 2026-04-20

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("year_published", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("min_playtime", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("max_playtime", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "max_playtime")
    op.drop_column("games", "min_playtime")
    op.drop_column("games", "year_published")
