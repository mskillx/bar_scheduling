import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin_user):
    login = await client.post("/api/auth/login", json={"email": "admin@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    resp = await client.get("/api/users/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_employee_cannot_list_users(client: AsyncClient, employee_user):
    login = await client.post("/api/auth/login", json={"email": "emp@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    resp = await client.get("/api/users/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, admin_user):
    login = await client.post("/api/auth/login", json={"email": "admin@test.com", "password": "TestPass123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/users/",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@test.com",
            "password": "Pass123!",
            "role": "employee",
            "hourly_rate": 15.0,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "john@test.com"
    assert data["hourly_rate"] == 15.0
