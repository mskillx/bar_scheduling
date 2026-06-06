from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shift import Shift
from app.repositories.shift_repository import ShiftRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftWithEmployee


class ShiftService:
    def __init__(self, db: AsyncSession):
        self.repo = ShiftRepository(db)
        self.emp_repo = EmployeeRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def get_shifts(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        employee_id: Optional[int] = None,
    ) -> List[ShiftWithEmployee]:
        if not start:
            start = datetime(2000, 1, 1, tzinfo=timezone.utc)
        if not end:
            end = datetime(2100, 1, 1, tzinfo=timezone.utc)

        shifts = await self.repo.get_shifts_in_range(start, end, employee_id)
        return [self._to_response(s) for s in shifts]

    async def get_by_id(self, shift_id: int) -> ShiftWithEmployee:
        shift = await self.repo.get_with_employee(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        return self._to_response(shift)

    async def create(self, data: ShiftCreate, actor_id: int) -> ShiftWithEmployee:
        emp = await self.emp_repo.get(data.employee_id)
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        overlaps = await self.repo.get_overlapping_shifts(
            data.employee_id, data.start_datetime, data.end_datetime
        )
        if overlaps:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Shift overlaps with an existing shift for this employee",
            )

        shift = Shift(
            employee_id=data.employee_id,
            start_datetime=data.start_datetime,
            end_datetime=data.end_datetime,
            notes=data.notes,
            status=data.status,
            created_by=actor_id,
        )
        await self.repo.create(shift)
        await self.audit_repo.log("create", "shift", shift.id, actor_id)
        loaded = await self.repo.get_with_employee(shift.id)
        return self._to_response(loaded)

    async def update(self, shift_id: int, data: ShiftUpdate, actor_id: int) -> ShiftWithEmployee:
        shift = await self.repo.get(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        update_data = data.model_dump(exclude_none=True)

        new_employee_id = update_data.get("employee_id", shift.employee_id)
        new_start = update_data.get("start_datetime", shift.start_datetime)
        new_end = update_data.get("end_datetime", shift.end_datetime)

        if "employee_id" in update_data or "start_datetime" in update_data or "end_datetime" in update_data:
            overlaps = await self.repo.get_overlapping_shifts(
                new_employee_id, new_start, new_end, exclude_id=shift_id
            )
            if overlaps:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Shift overlaps with an existing shift for this employee",
                )

        for field, value in update_data.items():
            setattr(shift, field, value)

        await self.audit_repo.log("update", "shift", shift_id, actor_id)
        loaded = await self.repo.get_with_employee(shift_id)
        return self._to_response(loaded)

    async def delete(self, shift_id: int, actor_id: int) -> None:
        shift = await self.repo.get(shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        await self.repo.delete(shift)
        await self.audit_repo.log("delete", "shift", shift_id, actor_id)

    def _to_response(self, shift: Shift) -> ShiftWithEmployee:
        first_name = last_name = None
        if hasattr(shift, "employee") and shift.employee and hasattr(shift.employee, "user") and shift.employee.user:
            first_name = shift.employee.user.first_name
            last_name = shift.employee.user.last_name

        return ShiftWithEmployee(
            id=shift.id,
            employee_id=shift.employee_id,
            start_datetime=shift.start_datetime,
            end_datetime=shift.end_datetime,
            notes=shift.notes,
            status=shift.status,
            created_by=shift.created_by,
            created_at=shift.created_at,
            updated_at=shift.updated_at,
            employee_name=f"{first_name} {last_name}".strip() if first_name else None,
            employee_first_name=first_name,
            employee_last_name=last_name,
        )
