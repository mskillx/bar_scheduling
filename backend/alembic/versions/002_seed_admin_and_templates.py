"""Seed admin user and shift templates

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:01:00.000000

"""
from typing import Sequence, Union
from datetime import date, time
from alembic import op
import sqlalchemy as sa
import bcrypt

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def upgrade() -> None:
    users = sa.table(
        "users",
        sa.column("id", sa.Integer),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("role", sa.Enum("admin", "employee", name="userrole", create_type=False)),
        sa.column("active", sa.Boolean),
        sa.column("must_change_password", sa.Boolean),
    )
    employees = sa.table(
        "employees",
        sa.column("user_id", sa.Integer),
        sa.column("hourly_rate", sa.Numeric),
        sa.column("hire_date", sa.Date),
    )
    templates = sa.table(
        "shift_templates",
        sa.column("name", sa.String),
        sa.column("start_time", sa.Time),
        sa.column("end_time", sa.Time),
    )

    op.bulk_insert(
        users,
        [
            {
                "first_name": "Admin",
                "last_name": "User",
                "email": "admin@example.com",
                "password_hash": _hash("ChangeMe123!"),
                "role": "admin",
                "active": True,
                "must_change_password": True,
            }
        ],
    )

    op.execute(sa.text(
        "INSERT INTO employees (user_id, hourly_rate, hire_date) "
        "SELECT id, 0, '2024-01-01' FROM users WHERE email='admin@example.com'"
    ))

    op.bulk_insert(
        templates,
        [
            {"name": "Morning Bar", "start_time": time(8, 0), "end_time": time(14, 0)},
            {"name": "Afternoon Bar", "start_time": time(14, 0), "end_time": time(20, 0)},
            {"name": "Evening Bar", "start_time": time(18, 0), "end_time": time(23, 0)},
            {"name": "Closing Shift", "start_time": time(21, 0), "end_time": time(3, 0)},
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM employees WHERE user_id IN (SELECT id FROM users WHERE email='admin@example.com')")
    op.execute("DELETE FROM users WHERE email='admin@example.com'")
    op.execute("DELETE FROM shift_templates WHERE name IN ('Morning Bar','Afternoon Bar','Evening Bar','Closing Shift')")
