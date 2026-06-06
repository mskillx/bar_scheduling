from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole = UserRole.employee


class UserCreate(UserBase):
    password: str
    hourly_rate: float = 0.0


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    active: Optional[bool] = None
    hourly_rate: Optional[float] = None


class UserResponse(UserBase):
    id: int
    active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserWithEmployee(UserResponse):
    hourly_rate: Optional[float] = None
    hire_date: Optional[str] = None
    employee_id: Optional[int] = None
