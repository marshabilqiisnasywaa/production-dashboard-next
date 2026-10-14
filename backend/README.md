# Backend

FastAPI + PostgreSQL (local install, no Docker).

## Setup

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

In `.env`, set `DATABASE_URL` and a long random `SECRET_KEY` (used to sign admin login tokens).

Create the database once, then put the real password in `.env`:

```powershell
psql -U postgres -c "CREATE DATABASE production_dashboard"
```

## Run

```powershell
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`python -m app.seed` creates the superadmin and the workshops "Workshop 5" and "Workshop 6" (existing ones are kept). Credentials come from, in order: `--username` and `--password` arguments, `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` in `.env`, then a prompt. Password minimum is 8 characters. Running it again resets that user's password.

```powershell
python -m app.seed --username admin --password "ganti-dengan-password-kuat"
```

Reset the database from scratch (drops every table, then rebuilds them):

```powershell
alembic downgrade base
alembic upgrade head
```

If the database itself was deleted, recreate it with the `CREATE DATABASE` command above, then run `alembic upgrade head`.

After changing a model, generate a new migration with `alembic revision --autogenerate -m "describe change"` and review it before applying.

Docs: http://localhost:8000/docs, health check: http://localhost:8000/api/health

## API

- `POST /api/auth/login`, `GET /api/auth/me`: superadmin login (JWT bearer token).
- `GET /api/public/boards`, `GET /api/public/boards/{slug}`: no login, used by the TV dashboards.
- `/api/admin/...`: workshops, lines, team members, and MPV history. Requires the superadmin token.
- `GET|PUT|DELETE /api/admin/lines/{id}/mpv[/{YYYY-MM}]`: one MPV per line per month. The public board shows the previous month's MPV (October shows September), or the latest earlier month if that one is empty.

Every line owns exactly one board. The board slug is its public link, `/dm-dashboard/{slug}` on the frontend.
