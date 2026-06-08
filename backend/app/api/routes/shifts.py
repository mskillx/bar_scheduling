from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User, UserRole
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftWithEmployee
from app.services.shift_service import ShiftService

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.get("/", response_model=List[ShiftWithEmployee])
async def list_shifts(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    employee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Employees requesting a specific employee_id can only see their own shifts
    if current_user.role == UserRole.employee and employee_id is not None:
        emp = await EmployeeRepository(db).get_by_user_id(current_user.id)
        own_id = emp.id if emp else -1
        employee_id = own_id
    return await ShiftService(db).get_shifts(start=start, end=end, employee_id=employee_id)


@router.post("/", response_model=ShiftWithEmployee, status_code=201)
async def create_shift(
    data: ShiftCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftService(db).create(data, actor_id=current_user.id)


@router.get("/{shift_id}", response_model=ShiftWithEmployee)
async def get_shift(
    shift_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftService(db).get_by_id(shift_id)


@router.put("/{shift_id}", response_model=ShiftWithEmployee)
async def update_shift(
    shift_id: int,
    data: ShiftUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ShiftService(db).update(shift_id, data, actor_id=current_user.id)


@router.delete("/{shift_id}", status_code=204)
async def delete_shift(
    shift_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await ShiftService(db).delete(shift_id, actor_id=current_user.id)
