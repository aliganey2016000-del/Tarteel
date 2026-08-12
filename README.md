# Tarteel — Quran Learning App

A modern, mobile-first Quran learning platform focused on reading, recitation, memorization, and consistent progress.

## Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- PostgreSQL + Prisma
- REST API
- Stateless HMAC-signed authentication tokens
- Node.js `scrypt` password hashing

## Monorepo

- `client/` — React frontend
- `server/` — Express API
- `prisma/` — database schema and migrations

## Current MVP

- Quran home dashboard
- Full 114-surah navigation and search
- Quran reader with Arabic/translation presentation
- Audio and recitation UI foundation
- Bookmark interaction
- Memorization dashboard
- Progress dashboard
- Responsive mobile-first design
- Account registration, login, and protected `/api/auth/me`
- Database-backed Surah API
- Database-backed bookmarks and reading progress
- Daily goals and recitation session APIs
- Role-based admin foundation with protected operational statistics and user listing
- Helmet, CORS, JSON-size limits, and graceful Prisma shutdown
- Frontend authentication API boundary with persistent bearer-token lifecycle helpers

## Authentication configuration

Copy `server/.env.example` to `server/.env` and set a unique `AUTH_SECRET` of at least 32 characters. Never commit the real secret. `DATABASE_URL` must point to the PostgreSQL database used by Prisma.

`ADMIN_EMAILS` is an optional comma-separated allowlist. A new account whose normalized email matches this allowlist is created with the `ADMIN` role. Existing users can be promoted by an authorized database operator. The application never contains a real admin credential.

Authentication endpoints:

- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — authenticate and receive a signed token
- `GET /api/auth/me` — retrieve the authenticated user with `Authorization: Bearer <token>`

The React client exposes these through `client/src/authApi.js`, including safe token lifecycle helpers and account operations. The UI can consume this boundary without duplicating authentication request logic. Tokens are stored under the `tarteel_token` key to remain compatible with existing authenticated API calls.

Passwords are hashed with Node.js `scrypt`; plaintext passwords are never stored.

## Admin API

Admin endpoints require a valid bearer token and a database-backed `ADMIN` role:

- `GET /api/admin/stats` — aggregate users, bookmarks, goals, and recitation sessions
- `GET /api/admin/users?limit=50` — recent users with activity counts

The authorization middleware re-checks the database role on every admin request, so removing the role takes effect immediately without waiting for token expiry.

## Development

```bash
npm install
npm run dev
```

For the server, run Prisma generation/migrations after configuring `DATABASE_URL`:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

The user-role migration is under `prisma/migrations/20260812045100_user_roles`.

See the individual `client` and `server` packages for environment configuration.
