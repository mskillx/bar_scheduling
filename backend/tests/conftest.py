import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.employee import Employee
from datetime import date

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession):
    user = User(
        first_name="Admin",
        last_name="Test",
        email="admin@test.com",
        password_hash=hash_password("TestPass123!"),
        role=UserRole.admin,
        active=True,
    )
    db_session.add(user)
    await db_session.flush()
    emp = Employee(user_id=user.id, hourly_rate=0, hire_date=date.today())
    db_session.add(emp)
    await db_session.commit()
    return user


@pytest_asyncio.fixture
async def employee_user(db_session: AsyncSession):
    user = User(
        first_name="Emp",
        last_name="Test",
        email="emp@test.com",
        password_hash=hash_password("TestPass123!"),
        role=UserRole.employee,
        active=True,
    )
    db_session.add(user)
    await db_session.flush()
    emp = Employee(user_id=user.id, hourly_rate=12.5, hire_date=date.today())
    db_session.add(emp)
    await db_session.commit()
    return user
