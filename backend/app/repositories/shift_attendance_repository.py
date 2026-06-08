from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shift_attendance import ShiftAttendance
from app.repositories.base import BaseRepository


class ShiftAttendanceRepository(BaseRepository[ShiftAttendance]):
    def __init__(self, db: AsyncSession):
        super().__init__(ShiftAttendance, db)

    async def get_by_shift(self, shift_id: int) -> Optional[ShiftAttendance]:
        result = await self.db.execute(
            select(ShiftAttendance).where(ShiftAttendance.shift_id == shift_id)
        )
        return result.scalar_one_or_none()

    async def get_active_for_employee(self, employee_id: int) -> Optional[ShiftAttendance]:
        """Return an attendance record that is checked in but not checked out."""
        result = await self.db.execute(
            select(ShiftAttendance).where(
                and_(
                    ShiftAttendance.employee_id == employee_id,
                    ShiftAttendance.check_in_at.is_not(None),
                    ShiftAttendance.check_out_at.is_(None),
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_employee_attendances_in_range(
        self, employee_id: int, start: datetime, end: datetime
    ) -> List[ShiftAttendance]:
        result = await self.db.execute(
            select(ShiftAttendance).where(
                and_(
                    ShiftAttendance.employee_id == employee_id,
                    ShiftAttendance.check_in_at >= start,
                    ShiftAttendance.check_in_at < end,
                )
            )
        )
        return list(result.scalars().all())
