from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class EmployeeBase(BaseModel):
    hourly_rate: float = 0.0
    hire_date: date


class EmployeeCreate(EmployeeBase):
    user_id: int


class EmployeeUpdate(BaseModel):
    hourly_rate: Optional[float] = None
    hire_date: Optional[date] = None


class EmployeeResponse(EmployeeBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
