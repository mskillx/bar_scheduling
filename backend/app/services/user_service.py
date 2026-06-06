from typing import List, Optional
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.models.employee import Employee
from app.repositories.user_repository import UserRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.user import UserCreate, UserUpdate, UserWithEmployee


class UserService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
        self.emp_repo = EmployeeRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserWithEmployee]:
        users = await self.user_repo.get_all_with_employees(skip=skip, limit=limit)
        return [self._enrich(u) for u in users]

    async def get_by_id(self, user_id: int) -> UserWithEmployee:
        user = await self.user_repo.get_with_employee(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return self._enrich(user)

    async def create(self, data: UserCreate, actor_id: int) -> UserWithEmployee:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        await self.user_repo.create(user)

        emp = Employee(user_id=user.id, hourly_rate=data.hourly_rate, hire_date=date.today())
        await self.emp_repo.create(emp)

        await self.audit_repo.log("create", "user", user.id, actor_id)
        return self._enrich(user, emp)

    async def update(self, user_id: int, data: UserUpdate, actor_id: int) -> UserWithEmployee:
        user = await self.user_repo.get_with_employee(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if data.email and data.email != user.email:
            existing = await self.user_repo.get_by_email(data.email)
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

        for field, value in data.model_dump(exclude_none=True).items():
            if field == "hourly_rate":
                if user.employee:
                    user.employee.hourly_rate = value
            else:
                setattr(user, field, value)

        await self.audit_repo.log("update", "user", user_id, actor_id)
        return self._enrich(user, user.employee)

    async def delete(self, user_id: int, actor_id: int) -> None:
        user = await self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user.active = False
        await self.audit_repo.log("disable", "user", user_id, actor_id)

    def _enrich(self, user: User, emp: Optional[Employee] = None) -> UserWithEmployee:
        employee = emp or (user.employee if hasattr(user, "employee") else None)
        return UserWithEmployee(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            role=user.role,
            active=user.active,
            must_change_password=user.must_change_password,
            created_at=user.created_at,
            updated_at=user.updated_at,
            hourly_rate=float(employee.hourly_rate) if employee else None,
            hire_date=str(employee.hire_date) if employee else None,
            employee_id=employee.id if employee else None,
        )
