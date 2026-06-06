from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.shift import Shift, ShiftStatus
from app.repositories.base import BaseRepository


class ShiftRepository(BaseRepository[Shift]):
    def __init__(self, db: AsyncSession):
        super().__init__(Shift, db)

    async def get_shifts_in_range(
        self, start: datetime, end: datetime, employee_id: Optional[int] = None
    ) -> List[Shift]:
        query = (
            select(Shift)
            .where(and_(Shift.start_datetime >= start, Shift.start_datetime < end))
            .options(selectinload(Shift.employee).selectinload(Employee.user))
        )
        if employee_id is not None:
            query = query.where(Shift.employee_id == employee_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_overlapping_shifts(
        self,
        employee_id: int,
        start_dt: datetime,
        end_dt: datetime,
        exclude_id: Optional[int] = None,
    ) -> List[Shift]:
        query = select(Shift).where(
            and_(
                Shift.employee_id == employee_id,
                Shift.status != ShiftStatus.cancelled,
                Shift.start_datetime < end_dt,
                Shift.end_datetime > start_dt,
            )
        )
        if exclude_id:
            query = query.where(Shift.id != exclude_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_employee(self, shift_id: int) -> Optional[Shift]:
        result = await self.db.execute(
            select(Shift)
            .where(Shift.id == shift_id)
            .options(selectinload(Shift.employee).selectinload(Employee.user))
        )
        return result.scalar_one_or_none()

    async def get_employee_shifts(self, employee_id: int, skip: int = 0, limit: int = 100) -> List[Shift]:
        result = await self.db.execute(
            select(Shift)
            .where(Shift.employee_id == employee_id)
            .order_by(Shift.start_datetime)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
