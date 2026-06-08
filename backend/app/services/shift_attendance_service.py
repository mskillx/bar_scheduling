from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shift_attendance import ShiftAttendance
from app.repositories.shift_attendance_repository import ShiftAttendanceRepository
from app.repositories.shift_repository import ShiftRepository
from app.schemas.shift_attendance import AttendanceStatus, AttendanceStats


class ShiftAttendanceService:
    def __init__(self, db: AsyncSession):
        self.repo = ShiftAttendanceRepository(db)
        self.shift_repo = ShiftRepository(db)

    async def get_today_status(self, employee_id: int) -> List[AttendanceStatus]:
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        shifts = await self.shift_repo.get_shifts_in_range(day_start, day_end, employee_id)
        results = []
        for shift in shifts:
            attendance = await self.repo.get_by_shift(shift.id)
            results.append(
                AttendanceStatus(
                    shift_id=shift.id,
                    employee_id=shift.employee_id,
                    shift_start=shift.start_datetime,
                    shift_end=shift.end_datetime,
                    check_in_at=attendance.check_in_at if attendance else None,
                    check_out_at=attendance.check_out_at if attendance else None,
                    attendance_id=attendance.id if attendance else None,
                )
            )
        return results

    async def check_in(self, shift_id: int, employee_id: int) -> AttendanceStatus:
        shift = await self.shift_repo.get(shift_id)
        if not shift or shift.employee_id != employee_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        # Prevent multiple active check-ins
        active = await self.repo.get_active_for_employee(employee_id)
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active check-in. Check out first.",
            )

        existing = await self.repo.get_by_shift(shift_id)
        if existing and existing.check_in_at:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already checked in for this shift",
            )

        if existing:
            existing.check_in_at = datetime.now(timezone.utc)
            await self.repo.db.flush()
            record = existing
        else:
            record = ShiftAttendance(
                shift_id=shift_id,
                employee_id=employee_id,
                check_in_at=datetime.now(timezone.utc),
            )
            await self.repo.create(record)

        return AttendanceStatus(
            shift_id=shift.id,
            employee_id=shift.employee_id,
            shift_start=shift.start_datetime,
            shift_end=shift.end_datetime,
            check_in_at=record.check_in_at,
            check_out_at=record.check_out_at,
            attendance_id=record.id,
        )

    async def check_out(self, shift_id: int, employee_id: int) -> AttendanceStatus:
        shift = await self.shift_repo.get(shift_id)
        if not shift or shift.employee_id != employee_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        record = await self.repo.get_by_shift(shift_id)
        if not record or not record.check_in_at:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Not checked in for this shift",
            )
        if record.check_out_at:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already checked out for this shift",
            )

        record.check_out_at = datetime.now(timezone.utc)
        await self.repo.db.flush()

        return AttendanceStatus(
            shift_id=shift.id,
            employee_id=shift.employee_id,
            shift_start=shift.start_datetime,
            shift_end=shift.end_datetime,
            check_in_at=record.check_in_at,
            check_out_at=record.check_out_at,
            attendance_id=record.id,
        )

    async def get_stats(self, employee_id: int) -> List[AttendanceStats]:
        now = datetime.now(timezone.utc)

        # Current week (Mon–Sun)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)

        # Current month
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            month_end = month_start.replace(year=now.year + 1, month=1)
        else:
            month_end = month_start.replace(month=now.month + 1)

        stats = []
        for label, start, end in [
            ("week", week_start, week_end),
            ("month", month_start, month_end),
        ]:
            shifts = await self.shift_repo.get_shifts_in_range(start, end, employee_id)
            expected_secs = sum(
                (s.end_datetime - s.start_datetime).total_seconds()
                for s in shifts
                if s.status != "cancelled"
            )

            attendances = await self.repo.get_employee_attendances_in_range(
                employee_id, start, end
            )
            effective_secs = sum(
                (a.check_out_at - a.check_in_at).total_seconds()
                for a in attendances
                if a.check_in_at and a.check_out_at
            )

            stats.append(
                AttendanceStats(
                    period_label=label,
                    expected_hours=round(expected_secs / 3600, 2),
                    effective_hours=round(effective_secs / 3600, 2),
                )
            )
        return stats
