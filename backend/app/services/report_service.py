from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shift import Shift, ShiftStatus
from app.models.employee import Employee
from app.models.user import User
from app.schemas.reports import EmployeeHours, HoursReport, WeeklyReport, MonthlyReport


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_hours_report(
        self, start: datetime, end: datetime
    ) -> HoursReport:
        rows = await self._get_employee_hours(start, end)
        total = sum(r.total_hours for r in rows)
        return HoursReport(employees=rows, total_hours=round(total, 2))

    async def get_weekly_report(self, week_start: datetime) -> WeeklyReport:
        week_end = week_start + timedelta(days=7)
        rows = await self._get_employee_hours(week_start, week_end)
        total = sum(r.total_hours for r in rows)
        return WeeklyReport(
            week_start=week_start.date().isoformat(),
            total_hours=round(total, 2),
            employees=rows,
        )

    async def get_monthly_report(self, year: int, month: int) -> MonthlyReport:
        import calendar
        _, last_day = calendar.monthrange(year, month)
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
        rows = await self._get_employee_hours(start, end)
        total = sum(r.total_hours for r in rows)
        return MonthlyReport(
            month=f"{year}-{month:02d}",
            total_hours=round(total, 2),
            employees=rows,
        )

    async def _get_employee_hours(self, start: datetime, end: datetime) -> List[EmployeeHours]:
        result = await self.db.execute(
            select(
                Employee.id,
                Employee.hourly_rate,
                User.first_name,
                User.last_name,
                func.sum(
                    func.extract("epoch", Shift.end_datetime - Shift.start_datetime) / 3600
                ).label("total_hours"),
            )
            .join(Shift, Shift.employee_id == Employee.id)
            .join(User, User.id == Employee.user_id)
            .where(
                and_(
                    Shift.start_datetime >= start,
                    Shift.start_datetime < end,
                    Shift.status != ShiftStatus.cancelled,
                )
            )
            .group_by(Employee.id, Employee.hourly_rate, User.first_name, User.last_name)
            .order_by(User.last_name, User.first_name)
        )
        rows = result.all()
        return [
            EmployeeHours(
                employee_id=r.id,
                first_name=r.first_name,
                last_name=r.last_name,
                total_hours=round(float(r.total_hours or 0), 2),
                hourly_rate=round(float(r.hourly_rate or 0), 2),
                expected_salary=round(float(r.total_hours or 0) * float(r.hourly_rate or 0), 2),
            )
            for r in rows
        ]
