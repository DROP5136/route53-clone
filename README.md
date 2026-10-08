# Route 53

A functional AWS Route 53 clone. It recreates the Route 53 console experience and the core hosted-zone and DNS-record workflows. It does not perform real DNS resolution or call AWS.

Stack:

- Next.js 16 and TypeScript
- FastAPI
- SQLite

## Features

### Authentication

- Registration
- Login
- Logout
- Session persistence in the browser

### Hosted zones

- View, search, create, edit, and delete hosted zones
- Data is stored in SQLite
- Search matches domain name, description, and hosted zone ID in the browser
- The list is paginated at 10 rows per page

### DNS records

- View, search, create, edit, and delete records inside a hosted zone
- Data is stored in SQLite
- Search matches record name and type in the browser
- The list is paginated at 10 rows per page
- Supported types: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA

### Route 53 experience

- AWS-style header, sidebar, and breadcrumbs
- Tables, search, pagination, forms, modals, and success/error notices

### Mocked sections

These pages are placeholders and show a coming-soon message:

- Dashboard
- Traffic policies
- Health checks
- Resolver
- Profiles

The Route 53 home page is also a placeholder. Hosted zones and DNS records are the implemented workflows.

## Project structure

```text
.
├── frontend/
├── backend/
└── README.md
```

### Frontend

- `frontend/app/` — App Router pages, including login, register, hosted zones, and the placeholder sections
- `frontend/components/` — console shell, hosted-zone and DNS-record views, forms, and pagination
- `frontend/lib/api.ts` — API client and browser token storage
- `frontend/public/aws-logo.svg` — AWS logo used in the header

### Backend

- `backend/app/main.py` — FastAPI app, CORS, and the health check
- `backend/app/auth.py` — registration, login, and the current-user endpoint
- `backend/app/zones.py` — hosted-zone routes
- `backend/app/records.py` — DNS-record routes
- `backend/app/models.py` — SQLAlchemy models
- `backend/app/database.py` — SQLite engine and table creation
- `backend/app/security.py` — password hashing and JWT creation
- `backend/app/config.py` — environment settings
- `backend/app.db` — SQLite database file, created on startup

## Prerequisites

- Node.js and npm. The frontend uses Next.js 16.4.0, React 19.3.0, and TypeScript 5.
- Python 3.10 or newer. The backend uses the versions in `backend/requirements.txt` (FastAPI 0.143.0, Uvicorn 0.54.0, SQLAlchemy 2.1.4, PyJWT 2.15.1, bcrypt 5.0.0, python-dotenv 1.2.4).
- SQLite is used through Python’s standard library. A separate SQLite server is not required.

## Setup

Start the backend before the frontend. The API creates `backend/app.db` on startup.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS or Linux, activate the environment with `source .venv/bin/activate`.

Create `backend/.env`. The repository does not include an `.env.example` file. `JWT_SECRET_KEY` is required. The other two values have defaults.

```text
JWT_SECRET_KEY=replace-with-a-local-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

`JWT_ALGORITHM` may be `HS256`, `HS384`, or `HS512`. The token lifetime must be a positive number of minutes.

```powershell
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/health

### Frontend

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`. This file is gitignored. `NEXT_PUBLIC_API_URL` is required.

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

```powershell
npm run dev
```

- App: http://localhost:3000

The API allows browser calls from `http://localhost:3000` and `http://127.0.0.1:3000`.

## Authentication

Registration and login are mocked application accounts. They are not AWS IAM users.

1. Open `/register` and create a username and password. Usernames are stored in lowercase and cannot contain whitespace. Passwords must be 8 to 72 characters and at most 72 UTF-8 bytes. Registration does not sign the user in.
2. Open `/login`. A successful login returns a bearer JWT.
3. The browser stores that token in `localStorage` under `route53_access_token` and sends it as `Authorization: Bearer` on API requests.
4. On later visits, the app calls `GET /auth/me` with the stored token. An expired or invalid token is cleared.
5. Sign out from the account control in the header. That removes the token from the browser.

`/hosted-zones` and `/hosted-zones/{zoneId}` redirect to `/login` when there is no token. Login and register sit outside the console shell. Dashboard and the other placeholder pages remain reachable without signing in; their account control shows **Sign in**.

Hosted-zone and DNS-record API routes require a valid bearer token. A user can only access zones they own. A missing zone and another user’s zone both return 404.

## Architecture

```text
Browser
  → Next.js frontend
  → FastAPI backend
  → SQLite database
```

- Next.js renders the Route 53-style console and handles search, pagination, forms, and notices in the browser.
- FastAPI exposes the REST API.
- SQLite persists users, hosted zones, and DNS records in `backend/app.db`.
- JWT authentication limits hosted zones and DNS records to the signed-in user.

## Database schema

Tables are created from `backend/app/models.py` when the API starts. Foreign keys are enabled.

### `users`

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `username` | Unique, 1–64 characters, stored lowercase, no whitespace |
| `password_hash` | bcrypt hash |
| `created_at` | UTC timestamp |

A user owns hosted zones through `hosted_zones.user_id`. Deleting a user deletes those zones.

### `hosted_zones`

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `user_id` | Foreign key to `users.id`, cascade on delete |
| `domain_name` | Required domain name, up to 253 characters |
| `zone_type` | `public` or `private` |
| `description` | Optional, up to 1024 characters |
| `created_at` | UTC timestamp |
| `updated_at` | UTC timestamp, set on update |

`domain_name` and `zone_type` are unique together. Deleting a hosted zone deletes its DNS records.

### `dns_records`

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `hosted_zone_id` | Foreign key to `hosted_zones.id`, cascade on delete |
| `name` | Required, 1–253 characters, no whitespace |
| `record_type` | `A`, `AAAA`, `CNAME`, `TXT`, `MX`, `NS`, `PTR`, `SRV`, or `CAA` |
| `value` | Required, 1–4000 characters |
| `ttl` | Integer |
| `created_at` | UTC timestamp |
| `updated_at` | UTC timestamp, set on update |

`hosted_zone_id`, `name`, and `record_type` are unique together. The API accepts and returns the record type as `type`.

## API overview

Authenticated routes expect `Authorization: Bearer <token>`. Request and response bodies are JSON. Delete routes return 204 with no body.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create a user. Returns the public user. 409 if the username exists. |
| `POST` | `/auth/login` | Return `{ "access_token", "token_type": "bearer" }`. 401 if the credentials are invalid. |
| `GET` | `/auth/me` | Return the signed-in user. |

### Hosted zones

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/zones` | Create a hosted zone for the signed-in user. Body: `domain_name`, `zone_type`, optional `description`. |
| `GET` | `/zones` | List that user’s hosted zones. |
| `GET` | `/zones/{zone_id}` | Return one owned hosted zone. |
| `PUT` | `/zones/{zone_id}` | Update domain name, type, and description. |
| `DELETE` | `/zones/{zone_id}` | Delete the zone and its DNS records. |

### DNS records

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/zones/{zone_id}/records` | Create a record. Body: `name`, `type`, `value`, `ttl`. |
| `GET` | `/zones/{zone_id}/records` | List records in an owned zone. |
| `GET` | `/zones/{zone_id}/records/{record_id}` | Return one record. |
| `PUT` | `/zones/{zone_id}/records/{record_id}` | Update name, type, value, and TTL. |
| `DELETE` | `/zones/{zone_id}/records/{record_id}` | Delete one record. |

`ttl` on write must be from 1 through 2147483647.

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns `{ "status": "ok" }`. No authentication. |

## Development notes

- No AWS account or AWS credentials are required.
- The application does not create, query, or change real Route 53 DNS data.
- IAM, accounts, and the unused console sections are mocked.
- Users, hosted zones, and DNS records persist in the local SQLite file.

## Testing

The repository does not include an automated test suite. Check the running app manually:

- Register an account, sign in, refresh the page, and confirm the session is still present.
- Sign out, then open `/hosted-zones` and confirm the app returns to `/login`.
- Create, edit, search, and delete a hosted zone.
- Open a hosted zone and create, edit, search, and delete DNS records, including more than one record type.
- With more than 10 hosted zones or records, use Previous and Next and confirm the page changes.
- Restart the API and confirm the same user still sees the saved zones and records.
