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
- `prisma/` — database schema

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
- Helmet, CORS, JSON-size limits, and graceful Prisma shutdown

## Authentication configuration

Copy `server/.env.example` to `server/.env` and set a unique `AUTH_SECRET` of at least 32 characters. Never commit the real secret. `DATABASE_URL` must point to the PostgreSQL database used by Prisma.

Authentication endpoints:

- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — authenticate and receive a signed token
- `GET /api/auth/me` — retrieve the authenticated user with `Authorization: Bearer <token>`

Passwords are hashed with Node.js `scrypt`; plaintext passwords are never stored.

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

See the individual `client` and `server` packages for environment configuration.
