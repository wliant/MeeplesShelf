"""Add image_filename to games

Revision ID: 003
Revises: 002
Create Date: 2026-04-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("image_filename", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "image_filename")
