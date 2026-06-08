from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AttendanceStatus(BaseModel):
    shift_id: int
    employee_id: int
    shift_start: datetime
    shift_end: datetime
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None
    attendance_id: Optional[int] = None

    model_config = {"from_attributes": True}


class AttendanceStats(BaseModel):
    period_label: str
    expected_hours: float
    effective_hours: float
