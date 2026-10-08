# Route 53

Separate Next.js frontend and FastAPI backend. SQLite is configured for persistence. Application features are not implemented yet.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://localhost:8000/health

## Layout

- `frontend/` — Next.js application (TypeScript)
- `backend/` — FastAPI application
- `backend/app/database.py` — SQLite engine and session setup
- `backend/app.db` — SQLite database file, created on first connection

No tables are defined yet.
