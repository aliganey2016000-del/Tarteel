# Coolify deployment

Tarteel is intended to deploy from the private `main` branch with Coolify using the repository's production Dockerfile.

## 1. Authenticate the private repository

The repository is private. Coolify must therefore use an authenticated Git source before it can fetch `main`.

**Preferred:** install/configure the Coolify GitHub App and grant it access to `aliganey2016000-del/Tarteel`.

If the existing Coolify source is configured as an unauthenticated HTTPS repository, deployment will fail before the Docker build with an error similar to:

```text
fatal: could not read Username for 'https://github.com': No such device or address
```

Do not put a GitHub password, token, deploy key, or other credential in this repository or in the Dockerfile.

## 2. Application settings

Use these values for the Coolify application:

- Repository: `aliganey2016000-del/Tarteel`
- Branch: `main`
- Build Pack: `Dockerfile`
- Base Directory: `/`
- Dockerfile: `/Dockerfile`
- Application Port: `3000`

The repository Dockerfile builds the Vite client, generates Prisma, installs production server dependencies, and serves the combined web/API application on port `3000`.

## 3. Required runtime environment

Set these as Coolify environment variables; never commit their values:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — random secret of at least 32 characters

Optional:

- `ADMIN_EMAILS` — comma-separated normalized email allowlist for initial administrator accounts
- `CLIENT_URL` — public browser origin used by the API CORS policy
- `TRUST_PROXY=true` — enable when the deployment is behind a trusted reverse proxy and the application must use the forwarded client IP for rate limiting
- `VITE_QURAN_API_URL` — optional Quran provider override
- `VITE_QURAN_AUDIO_CDN_URL` — optional audio CDN override
- `VITE_QURAN_AUDIO_BITRATE` — optional audio bitrate override

## 4. Health check

The container exposes:

```text
GET /api/health
```

A healthy deployment returns JSON containing `ok: true` and `database: "ok"`.

Coolify should use port `3000` for the application. The Dockerfile also defines a container health check against `http://127.0.0.1:3000/api/health`.

## 5. Automatic deployment

After the GitHub App/source is authenticated and the application is connected to `main`, enable Coolify automatic deployments. A push to `main` should then trigger:

```text
GitHub push
  -> Coolify webhook
  -> authenticated repository fetch
  -> Dockerfile build
  -> container replacement
  -> /api/health check
  -> live deployment
```

If deployment fails at `git ls-remote`, fix the Coolify Git source authentication first. Application code, Prisma migrations, and the Dockerfile are not involved until repository fetch succeeds.

## 6. Database migrations

Prisma client generation occurs during the Docker build. Production schema migrations should be applied through the deployment/database release process using the deployment environment's `DATABASE_URL`; do not run development migrations against production accidentally.

Never commit a production `.env` file or real database credentials.
