from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.shift_attendance import AttendanceStatus, AttendanceStats
from app.services.shift_attendance_service import ShiftAttendanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


async def _require_employee_id(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> int:
    emp = await EmployeeRepository(db).get_by_user_id(current_user.id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an employee")
    return emp.id


@router.get("/today", response_model=List[AttendanceStatus])
async def today_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    emp = await EmployeeRepository(db).get_by_user_id(current_user.id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an employee")
    return await ShiftAttendanceService(db).get_today_status(emp.id)


@router.post("/checkin/{shift_id}", response_model=AttendanceStatus)
async def check_in(
    shift_id: int,
    employee_id: int = Depends(_require_employee_id),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftAttendanceService(db).check_in(shift_id, employee_id)


@router.post("/checkout/{shift_id}", response_model=AttendanceStatus)
async def check_out(
    shift_id: int,
    employee_id: int = Depends(_require_employee_id),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftAttendanceService(db).check_out(shift_id, employee_id)


@router.get("/stats", response_model=List[AttendanceStats])
async def attendance_stats(
    employee_id: int = Depends(_require_employee_id),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftAttendanceService(db).get_stats(employee_id)
