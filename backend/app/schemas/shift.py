from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator

from app.models.shift import ShiftStatus


class ShiftBase(BaseModel):
    employee_id: int
    start_datetime: datetime
    end_datetime: datetime
    notes: Optional[str] = None
    status: ShiftStatus = ShiftStatus.scheduled


class ShiftCreate(ShiftBase):
    @model_validator(mode="after")
    def validate_times(self) -> "ShiftCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


class ShiftUpdate(BaseModel):
    employee_id: Optional[int] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[ShiftStatus] = None

    @model_validator(mode="after")
    def validate_times(self) -> "ShiftUpdate":
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                raise ValueError("end_datetime must be after start_datetime")
        return self


class ShiftResponse(ShiftBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ShiftWithEmployee(ShiftResponse):
    employee_first_name: Optional[str] = None
    employee_last_name: Optional[str] = None
