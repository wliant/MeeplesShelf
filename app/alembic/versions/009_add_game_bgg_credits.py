"""Add categories, mechanics, designers, publishers to games table

Revision ID: 009
Revises: 008
Create Date: 2026-04-21

"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("categories", postgresql.JSONB(), nullable=True))
    op.add_column("games", sa.Column("mechanics",  postgresql.JSONB(), nullable=True))
    op.add_column("games", sa.Column("designers",  postgresql.JSONB(), nullable=True))
    op.add_column("games", sa.Column("publishers", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "publishers")
    op.drop_column("games", "designers")
    op.drop_column("games", "mechanics")
    op.drop_column("games", "categories")
