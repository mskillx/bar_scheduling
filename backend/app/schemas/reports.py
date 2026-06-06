from pydantic import BaseModel
from typing import List


class EmployeeHours(BaseModel):
    employee_id: int
    first_name: str
    last_name: str
    total_hours: float


class WeeklyReport(BaseModel):
    week_start: str
    total_hours: float
    employees: List[EmployeeHours]


class MonthlyReport(BaseModel):
    month: str
    total_hours: float
    employees: List[EmployeeHours]


class HoursReport(BaseModel):
    employees: List[EmployeeHours]
    total_hours: float
