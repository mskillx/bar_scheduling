from datetime import time, datetime
from typing import Optional
from pydantic import BaseModel


class ShiftTemplateBase(BaseModel):
    name: str
    start_time: time
    end_time: time


class ShiftTemplateCreate(ShiftTemplateBase):
    pass


class ShiftTemplateUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class ShiftTemplateResponse(ShiftTemplateBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
