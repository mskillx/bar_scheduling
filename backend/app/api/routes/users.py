from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserWithEmployee
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserWithEmployee])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await UserService(db).get_all(skip=skip, limit=limit)


@router.post("/", response_model=UserWithEmployee, status_code=201)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await UserService(db).create(data, actor_id=current_user.id)


@router.get("/{user_id}", response_model=UserWithEmployee)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value != "admin" and current_user.id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await UserService(db).get_by_id(user_id)


@router.put("/{user_id}", response_model=UserWithEmployee)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await UserService(db).update(user_id, data, actor_id=current_user.id)


@router.delete("/{user_id}", status_code=204)
async def disable_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await UserService(db).delete(user_id, actor_id=current_user.id)
