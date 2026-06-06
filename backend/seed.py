"""
Standalone seed script — populates employees and shifts for development.

Run from the backend directory:
    python seed.py

To connect to a local Postgres instead of Docker:
    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sterlin_scheduling python seed.py
"""
import asyncio
import os
from datetime import date, datetime, timedelta, timezone, time as dtime

import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_

from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.shift import Shift, ShiftStatus

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/sterlin_scheduling",
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


EMPLOYEES = [
    ("Marco", "Rossi", "marco.rossi@bar.com", "Password123!"),
    ("Sofia", "Ferrari", "sofia.ferrari@bar.com", "Password123!"),
    ("Luca", "Bianchi", "luca.bianchi@bar.com", "Password123!"),
    ("Giulia", "Romano", "giulia.romano@bar.com", "Password123!"),
    ("Matteo", "Conti", "matteo.conti@bar.com", "Password123!"),
    ("Elena", "Marini", "elena.marini@bar.com", "Password123!"),
]

# (name, start_hour, end_hour) — end_hour < start_hour means next-day crossing
SHIFT_TEMPLATES = [
    ("Morning Bar", 8, 14),
    ("Afternoon Bar", 14, 20),
    ("Evening Bar", 18, 23),
    ("Closing Shift", 21, 3),
]

# Assign shift slots per weekday (0=Mon … 6=Sun)
# Each tuple: (template_index, employee_index_rotation_offset)
DAY_SCHEDULE = {
    0: [(0, 0), (0, 1), (1, 2), (1, 3), (2, 4), (3, 5)],  # Mon
    1: [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (3, 0)],  # Tue
    2: [(0, 2), (0, 3), (1, 4), (1, 5), (2, 0), (3, 1)],  # Wed
    3: [(0, 3), (0, 4), (1, 5), (1, 0), (2, 1), (3, 2)],  # Thu
    4: [(0, 4), (0, 5), (1, 0), (1, 1), (2, 2), (3, 3)],  # Fri
    5: [(0, 5), (0, 0), (1, 1), (1, 2), (2, 3), (3, 4)],  # Sat
    6: [(0, 0), (1, 1), (2, 2), (3, 3)],                   # Sun (lighter)
}


async def get_or_create_employee(db: AsyncSession, first: str, last: str, email: str, pwd: str) -> Employee:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        emp_result = await db.execute(select(Employee).where(Employee.user_id == user.id))
        emp = emp_result.scalar_one_or_none()
        if emp:
            print(f"  [skip] {email} already exists")
            return emp

    if not user:
        user = User(
            first_name=first,
            last_name=last,
            email=email,
            password_hash=_hash(pwd),
            role=UserRole.employee,
            active=True,
            must_change_password=False,
        )
        db.add(user)
        await db.flush()
        print(f"  [+] Created user: {first} {last} <{email}>")

    emp = Employee(user_id=user.id, hourly_rate=12.50, hire_date=date(2024, 1, 15))
    db.add(emp)
    await db.flush()
    return emp


async def shift_exists(db: AsyncSession, employee_id: int, start_dt: datetime, end_dt: datetime) -> bool:
    result = await db.execute(
        select(Shift).where(
            and_(
                Shift.employee_id == employee_id,
                Shift.status != ShiftStatus.cancelled,
                Shift.start_datetime < end_dt,
                Shift.end_datetime > start_dt,
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Require admin to exist (created by migration 002)
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            print("ERROR: admin@example.com not found. Run `alembic upgrade head` first.")
            return

        print("\n=== Creating employees ===")
        employees: list[Employee] = []
        for first, last, email, pwd in EMPLOYEES:
            emp = await get_or_create_employee(db, first, last, email, pwd)
            employees.append(emp)

        print("\n=== Creating shifts (this week + next week) ===")
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        shift_count = 0

        for week_offset in range(2):
            for day_offset in range(7):
                day = monday + timedelta(weeks=week_offset, days=day_offset)
                weekday = day.weekday()
                assignments = DAY_SCHEDULE.get(weekday, [])

                for tpl_idx, emp_offset in assignments:
                    emp = employees[emp_offset % len(employees)]
                    tpl_name, start_h, end_h = SHIFT_TEMPLATES[tpl_idx]

                    start_dt = datetime.combine(day, dtime(start_h, 0), tzinfo=timezone.utc)
                    # Handle midnight crossing
                    end_day = day + timedelta(days=1) if end_h < start_h else day
                    end_dt = datetime.combine(end_day, dtime(end_h, 0), tzinfo=timezone.utc)

                    if await shift_exists(db, emp.id, start_dt, end_dt):
                        continue

                    db.add(Shift(
                        employee_id=emp.id,
                        start_datetime=start_dt,
                        end_datetime=end_dt,
                        status=ShiftStatus.scheduled,
                        created_by=admin.id,
                    ))
                    shift_count += 1

        await db.commit()
        print(f"\nDone. Created {shift_count} new shifts across 2 weeks.")
        print("Default password for all seeded employees: Password123!")


if __name__ == "__main__":
    asyncio.run(seed())
