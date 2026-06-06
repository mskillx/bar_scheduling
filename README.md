# Sterlin Scheduling

Production-ready employee shift scheduling platform for a bar/pub.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT (access 15min + refresh 30 days), bcrypt |
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State | TanStack Query + Zustand |
| Calendar | FullCalendar |
| Charts | Recharts |
| Infra | Docker Compose, Nginx reverse proxy |

---

## Quick Start

```bash
# 1. Clone and navigate
cd sterlin_scheduling

# 2. Copy environment config
cp .env.example .env
# Edit .env with secure values for production

# 3. Build and start
docker compose up --build

# 4. Application is available at:
#   http://localhost        -> full app (via Nginx)
#   http://localhost:8000   -> backend API direct
#   http://localhost:8000/api/docs -> Swagger UI
```

**Default admin credentials:**
- Email: `admin@example.com`
- Password: `ChangeMe123!`
- You will be prompted to change the password on first login.

---

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

pip install -r requirements.txt
cp .env.example .env       # set DATABASE_URL to local postgres
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:3000
```

---

## Architecture

```
sterlin_scheduling/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI routers (auth, users, shifts, reports)
│   │   ├── core/             # Config, DB engine, JWT/bcrypt utils
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Business logic layer
│   │   ├── repositories/     # Data access layer (repository pattern)
│   │   ├── dependencies/     # FastAPI DI (get_current_user, require_admin)
│   │   └── main.py
│   ├── alembic/              # Migrations (001 schema, 002 seed admin)
│   └── tests/                # Pytest async test suite
├── frontend/
│   └── src/
│       ├── api/              # Axios API clients with auto token refresh
│       ├── components/       # Modal, ShiftForm, ShiftContextMenu, StatsCard
│       ├── hooks/            # useAuth, useShifts (React Query)
│       ├── layouts/          # AppLayout, Sidebar, TopNav
│       ├── pages/            # Login, Schedule, EmployeeDashboard, admin/*
│       ├── routes/           # React Router + RequireAuth/RequireAdmin guards
│       ├── stores/           # Zustand auth store (persisted)
│       └── types/            # TypeScript interfaces
├── nginx/nginx.conf          # Reverse proxy (port 80 -> backend + frontend)
└── docker-compose.yml
```

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Get JWT tokens |
| POST | `/api/auth/refresh` | — | Rotate tokens |
| GET | `/api/auth/me` | JWT | Current user info |
| POST | `/api/auth/change-password` | JWT | Change password |
| GET | `/api/users/` | admin | List all users |
| POST | `/api/users/` | admin | Create user + employee record |
| PUT | `/api/users/{id}` | admin | Update user |
| DELETE | `/api/users/{id}` | admin | Disable user |
| GET | `/api/shifts/` | JWT | List shifts (employees see only own) |
| POST | `/api/shifts/` | admin | Create shift (overlap check) |
| PUT | `/api/shifts/{id}` | admin | Update/move/resize shift |
| DELETE | `/api/shifts/{id}` | admin | Delete shift |
| GET | `/api/templates/` | JWT | List shift templates |
| GET | `/api/reports/hours` | admin | Hours by employee in date range |
| GET | `/api/reports/weekly` | admin | Weekly summary |
| GET | `/api/reports/monthly` | admin | Monthly summary |

Interactive Swagger docs: `http://localhost:8000/api/docs`

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest --cov=app tests/
```

Tests use SQLite in-memory — no PostgreSQL needed.

---

## Security

- bcrypt password hashing
- JWT access tokens (15 min) + rotating refresh tokens (30 days)
- RBAC enforced at the API dependency layer
- Overlap validation on shift creation/update
- Rate limiting (slowapi)
- CORS restricted to configured origins
- Audit log for all create/update/delete/disable operations
- `must_change_password` flag on seeded admin account

## Production Checklist

- [ ] Generate a strong `SECRET_KEY` (`openssl rand -hex 32`)
- [ ] Set `ENVIRONMENT=production`
- [ ] Restrict `CORS_ORIGINS` to your actual domain
- [ ] Add TLS to Nginx (Let's Encrypt / Certbot)
- [ ] Use a managed PostgreSQL with SSL (`?ssl=require`)
- [ ] Back up `postgres_data` Docker volume
- [ ] Configure log aggregation (stdout -> ELK / Loki)
