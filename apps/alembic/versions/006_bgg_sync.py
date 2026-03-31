"""Add BGG sync status table

Revision ID: 006
Revises: 005
Create Date: 2026-03-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bgg_sync_status",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("bgg_username", sa.String(255), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="idle"),
        sa.Column("games_imported", sa.Integer(), server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_bgg_sync_status_user_id", "bgg_sync_status", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_bgg_sync_status_user_id", table_name="bgg_sync_status")
    op.drop_table("bgg_sync_status")
