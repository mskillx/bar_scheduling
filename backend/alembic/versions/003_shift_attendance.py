"""Add shift_attendances table for check-in/check-out

Revision ID: 003
Revises: 002
Create Date: 2024-01-01 00:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shift_attendances",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("shift_id", sa.Integer, sa.ForeignKey("shifts.id"), nullable=False),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_shift_attendances_shift_id", "shift_attendances", ["shift_id"])
    op.create_index("ix_shift_attendances_employee_id", "shift_attendances", ["employee_id"])
    op.create_index("ix_shift_attendances_check_in_at", "shift_attendances", ["check_in_at"])


def downgrade() -> None:
    op.drop_table("shift_attendances")
