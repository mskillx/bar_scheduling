from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.shift_template import ShiftTemplate
from app.models.user import User
from app.schemas.shift_template import ShiftTemplateCreate, ShiftTemplateUpdate, ShiftTemplateResponse

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=List[ShiftTemplateResponse])
async def list_templates(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShiftTemplate).order_by(ShiftTemplate.name))
    return list(result.scalars().all())


@router.post("/", response_model=ShiftTemplateResponse, status_code=201)
async def create_template(
    data: ShiftTemplateCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    tpl = ShiftTemplate(**data.model_dump())
    db.add(tpl)
    await db.flush()
    await db.refresh(tpl)
    return tpl


@router.put("/{tpl_id}", response_model=ShiftTemplateResponse)
async def update_template(
    tpl_id: int,
    data: ShiftTemplateUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShiftTemplate).where(ShiftTemplate.id == tpl_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(tpl, k, v)
    return tpl


@router.delete("/{tpl_id}", status_code=204)
async def delete_template(
    tpl_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ShiftTemplate).where(ShiftTemplate.id == tpl_id))
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    await db.delete(tpl)
