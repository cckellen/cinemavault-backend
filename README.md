# CinemaVault Backend API

TypeScript RESTful API for the CinemaVault film discovery platform (6003CEM Web API Development coursework).

## Features

- **Authentication**: JWT-based auth with role-based access control (USER / ADMIN)
- **Movies**: Public browse, search, filter (title, genre, year, rating), sort; admin CRUD
- **Favourites**: Registered users can save favourite films
- **Messages**: Users send messages to admin; admin can reply and delete
- **Profile**: View/update username and upload profile photos
- **Meta**: Health check, genre list, admin dashboard stats
- **Seed data**: Sample users and films via `npm run db:seed`
- **Watchlist / Watched**: Track viewing progress
- **OMDB Integration**: Search and import film metadata from [OMDB API](https://www.omdbapi.com)
- **OpenAPI 3.0**: Full specification at `/api-docs`
- **HATEOAS**: Hypermedia links on API root and movie resources
- **Conditional HTTP**: ETag / If-None-Match support on movie endpoints

## Tech Stack

- Node.js + Express + TypeScript
- Prisma ORM + MySQL
- Zod validation
- Jest + Supertest for API tests
- Swagger UI for API documentation

## Prerequisites

- Node.js 18+
- MySQL 8+

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and OMDB_API_KEY

npx prisma generate
npx prisma db push
npm run db:seed

npm run dev
```

Server runs at `http://localhost:5000`. Swagger UI at `http://localhost:5000/api-docs`.

## Admin Account

Register with an email containing `admin` (e.g. `admin@cinemavault.com`) to receive the ADMIN role automatically.

After seeding: `admin@cinemavault.com` / `admin123`, `demo@cinemavault.com` / `demo123`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port (default: 5000) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `OMDB_API_KEY` | API key from omdbapi.com |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/movies` | Public | Browse films |
| GET | `/api/movies/:id` | Public | Film details |
| GET | `/api/admin/movies` | Admin | All films |
| POST | `/api/admin/movies` | Admin | Create film |
| POST | `/api/admin/movies/import` | Admin | Import from OMDB |
| GET | `/api/favorites` | JWT | User favourites |
| POST | `/api/favorites` | JWT | Add favourite |
| GET | `/api/messages` | JWT | Messages |
| POST | `/api/messages` | JWT | Send to admin |
| GET | `/api/profile` | JWT | User profile |
| PUT | `/api/profile` | JWT | Update username |
| POST | `/api/profile/avatar` | JWT | Upload photo |
| GET | `/api/watchlist` | JWT | Watchlist items |
| GET | `/api/health` | Public | Health check |
| GET | `/api/genres` | Public | Distinct genres |
| GET | `/api/stats` | Admin | Dashboard statistics |
| GET | `/api/omdb/search?q=` | Public | OMDB search |

## Testing

Tests read **only `.env.test`** (never `.env`). `npm test` fails immediately if:

- `DATABASE_URL` is missing, has placeholder credentials, or cannot connect to `cinemavault_test`
- `OMDB_API_KEY` is missing or still a placeholder — OMDB tests call the real API

```bash
cp .env.test.example .env.test
# Edit .env.test: real MySQL password + real OMDB API key

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cinemavault_test;"
npx prisma db push

npm test
```

### Coverage

| Test file | Endpoints covered |
|-----------|-------------------|
| `00-database.test.ts` | Verifies `.env.test` DB + OMDB key |
| `auth.test.ts` | Register, login, `/auth/me` |
| `movies.test.ts` | Browse/search/filter, ETag, CRUD |
| `admin.test.ts` | Admin movie list |
| `favorites.test.ts` | Favourites |
| `messages.test.ts` | Messages |
| `watchlist.test.ts` | Watchlist |
| `profile.test.ts` | Profile, avatar upload |
| `meta.test.ts` | Health, genres, stats |
| `omdb.test.ts` | Real OMDB search + import |

Tests use setup/teardown against `cinemavault_test` only. Production `.env` is never loaded during tests.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run API endpoint tests |
| `npm run db:seed` | Seed demo users and sample films |
| `npm run prisma:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app.ts              # Express app factory (used by tests)
├── server.ts           # Server entry point
├── lib/prisma.ts       # Prisma client singleton
├── middleware/auth.ts  # JWT + RBAC middleware
├── routes/             # API route handlers
├── utils/              # Helpers (ETag, OMDB, movie formatting)
prisma/schema.prisma    # Database schema
swagger.json            # OpenAPI specification
tests/                  # Jest + Supertest API tests
├── helpers.ts          # Shared setup, auth helpers, cleanup
├── fixtures/           # Test assets (avatar.png)
├── auth.test.ts
├── movies.test.ts
├── admin.test.ts
├── favorites.test.ts
├── messages.test.ts
├── watchlist.test.ts
├── profile.test.ts
└── meta.test.ts
```
