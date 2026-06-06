from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.reports import HoursReport, WeeklyReport, MonthlyReport
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/hours", response_model=HoursReport)
async def hours_report(
    start: datetime = Query(...),
    end: datetime = Query(...),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).get_hours_report(start, end)


@router.get("/weekly", response_model=WeeklyReport)
async def weekly_report(
    week_start: datetime = Query(...),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).get_weekly_report(week_start)


@router.get("/monthly", response_model=MonthlyReport)
async def monthly_report(
    year: int = Query(...),
    month: int = Query(...),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).get_monthly_report(year, month)
