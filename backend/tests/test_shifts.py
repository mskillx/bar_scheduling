import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee


@pytest.mark.asyncio
async def test_create_and_list_shift(client: AsyncClient, admin_user, db_session: AsyncSession):
    login = await client.post("/api/auth/login", json={"email": "admin@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    result = await db_session.execute(sa_select(Employee).where(Employee.user_id == admin_user.id))
    emp = result.scalar_one()

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    resp = await client.post(
        "/api/shifts/",
        json={
            "employee_id": emp.id,
            "start_datetime": now.isoformat(),
            "end_datetime": (now + timedelta(hours=8)).isoformat(),
        },
        headers=headers,
    )
    assert resp.status_code == 201
    shift_id = resp.json()["id"]

    list_resp = await client.get("/api/shifts/", headers=headers)
    assert list_resp.status_code == 200
    assert any(s["id"] == shift_id for s in list_resp.json())


@pytest.mark.asyncio
async def test_overlapping_shift_rejected(client: AsyncClient, admin_user, db_session: AsyncSession):
    login = await client.post("/api/auth/login", json={"email": "admin@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    result = await db_session.execute(sa_select(Employee).where(Employee.user_id == admin_user.id))
    emp = result.scalar_one()

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    payload = {
        "employee_id": emp.id,
        "start_datetime": now.isoformat(),
        "end_datetime": (now + timedelta(hours=8)).isoformat(),
    }
    await client.post("/api/shifts/", json=payload, headers=headers)
    resp2 = await client.post("/api/shifts/", json=payload, headers=headers)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_employee_cannot_create_shift(client: AsyncClient, employee_user):
    login = await client.post("/api/auth/login", json={"email": "emp@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/api/shifts/",
        json={"employee_id": 1, "start_datetime": now.isoformat(), "end_datetime": (now + timedelta(hours=4)).isoformat()},
        headers=headers,
    )
    assert resp.status_code == 403
