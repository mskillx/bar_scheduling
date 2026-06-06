from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey, Numeric, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    hourly_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    hire_date: Mapped[date] = mapped_column(Date, default=date.today)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="employee")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="employee")
