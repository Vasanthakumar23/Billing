# Billing (Fee Collection + Tracker)

Management-only fee collection + tracking app.

Core rules:
- Payments are append-only (reverse via negative payment).
- Students are soft-deleted via `status=inactive`.
- Pending is computed: `expected_fee - sum(payments.amount)`.
- Receipt numbers are generated server-side atomically.

## Stack

- Backend: FastAPI + SQLAlchemy + Alembic + Postgres
- Frontend: Next.js App Router + Tailwind + React Query

## Quickstart (Docker)

1) Start services

`make up`

2) Run migrations (creates schema + seeds admin)

`make migrate`

3) Open apps

- Frontend: `http://localhost:3000`
- Backend OpenAPI: `http://localhost:8000/docs`

Default login:
- username: `admin`
- password: `admin123`

## Local Dev (no Docker)

### Backend

1) Create a Postgres database (e.g. `billing`).

2) Set env vars (copy `backend/.env.example` to `backend/.env`)

3) Install deps and run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

Set env vars (copy `frontend/.env.example` to `frontend/.env.local`).

```bash
cd frontend
npm install
npm run dev
```

## Exports

- Students CSV: `GET /api/export/students.csv`
- Payments CSV: `GET /api/export/payments.csv?from=&to=`
- Pending CSV: `GET /api/export/pending.csv`

## Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```
