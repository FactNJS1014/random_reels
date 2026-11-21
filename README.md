# AOTH GAMES — ตู้เสี่ยงโชค

Full-stack lottery reel: React + TypeScript + Tailwind CSS v4 frontend, Express + SQL Server backend.

```
random_newyear/
├─ backend/    Node.js + Express API (port 8080)
│  ├─ src/config/       env + SQL Server pool
│  ├─ src/db/           table DDL / bootstrap
│  ├─ src/services/     SQL queries (CRUD)
│  ├─ src/controllers/  request validation + responses
│  ├─ src/routes/       /api/common-random, /api/members
│  └─ src/scripts/      database setup CLI
└─ frontend/   React + TypeScript + Vite + Tailwind v4 (port 5173)
```

## Setup

```bash
npm run install:all   # installs backend + frontend dependencies
npm run db:setup      # creates AOTH_GAMES_RANDOM (if missing) + both tables
npm run dev:backend   # http://localhost:8080
npm run dev:frontend  # http://localhost:5173
```

Backend configuration lives in `backend/.env` (see `.env.example`):

```
PORT=8080
DB_SERVER=localhost
DB_PORT=1433
DB_USER=localhost
DB_PASSWORD=
DB_NAME=AOTH_GAMES_RANDOM
```

If SQL Server rejects the blank-password login, create it once from an admin
account (this machine already has it), then rerun `npm run db:setup`:

```sql
CREATE LOGIN [localhost] WITH PASSWORD = '', CHECK_POLICY = OFF;
-- inside AOTH_GAMES_RANDOM:
CREATE USER [localhost] FOR LOGIN [localhost];
ALTER ROLE db_owner ADD MEMBER [localhost];
```

## Tables

`dbo.COMMON_RANDOM` — one row per spin

| Column | Type | Notes |
| --- | --- | --- |
| ID | INT IDENTITY | PK |
| NUMBERS | NVARCHAR(MAX) | comma-separated ball numbers |
| RESULT_NUMBER | NVARCHAR(50) | winning number |
| TOTAL_BALLS | INT | ball count at spin time |
| SPIN_SECONDS | INT | default 5 |
| CREATED_AT / UPDATED_AT | DATETIME2 | timestamps |

`dbo.Member_common` — member records

| Column | Type | Notes |
| --- | --- | --- |
| ID | INT IDENTITY | PK |
| MEMBER_CODE | NVARCHAR(50) | unique |
| MEMBER_NAME | NVARCHAR(200) | |
| EMAIL | NVARCHAR(200) | nullable |
| IS_ACTIVE | BIT | default 1 |
| CREATED_AT / UPDATED_AT | DATETIME2 | timestamps |

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | DB connectivity check |
| GET | `/api/common-random?page=1&pageSize=10` | list spins (newest first) |
| GET | `/api/common-random/:id` | one spin |
| POST | `/api/common-random` | create spin |
| PUT | `/api/common-random/:id` | update spin |
| DELETE | `/api/common-random/:id` | delete spin |
| DELETE | `/api/common-random` | delete every row in `COMMON_RANDOM` |
| GET | `/api/members?page=1&pageSize=20&search=` | list members |
| GET | `/api/members/:id` | one member |
| POST | `/api/members` | create member |
| PUT | `/api/members/:id` | update member |
| DELETE | `/api/members/:id` | delete member |

Create spin body:

```json
{
  "numbers": ["3", "7", "42"],
  "resultNumber": "42",
  "totalBalls": 3,
  "spinSeconds": 5
}
```

## Frontend

- The UI is a game-show reel: a vertical stack of number tiles with marquee
  bulbs and a red pointer marking the winning tile (no circular wheel).
- Number input adds a number to the reel (duplicates, invalid values and numbers
  already saved as a result are rejected). Numbers can be removed one by one or
  all at once.
- Spin runs for exactly 5 seconds: the tile stack scrolls and decelerates until
  the drawn number stops under the pointer, with a countdown/progress bar.
- The result is saved to `COMMON_RANDOM` through the API; after a successful
  insert the number is removed from the reel. `RESULT_NUMBER` values loaded from
  the table are filtered out of the reel, so inserted numbers never reappear
  (no history list is shown in the UI).
- A `Delete ข้อมูลทั้งหมด` button clears every row in `COMMON_RANDOM`
  (`DELETE /api/common-random`) and lets those numbers be reused.
- API base URL defaults to `http://localhost:8080/api`; override with
  `VITE_API_URL`.
