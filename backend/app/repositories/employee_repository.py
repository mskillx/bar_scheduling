from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.repositories.base import BaseRepository


class EmployeeRepository(BaseRepository[Employee]):
    def __init__(self, db: AsyncSession):
        super().__init__(Employee, db)

    async def get_by_user_id(self, user_id: int) -> Optional[Employee]:
        result = await self.db.execute(select(Employee).where(Employee.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_with_user(self, employee_id: int) -> Optional[Employee]:
        result = await self.db.execute(
            select(Employee)
            .where(Employee.id == employee_id)
            .options(selectinload(Employee.user))
        )
        return result.scalar_one_or_none()
