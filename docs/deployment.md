# Production deployment

Tarteel supports both a Docker Compose deployment and a single-container deployment suitable for a simple Coolify application.

## Single-container deployment (Coolify)

The repository root `Dockerfile` builds the React/Vite client, installs the Express/Prisma server, generates the Prisma client, and starts both services behind one public HTTP port. The web process listens on port `3000` and proxies `/api/*` to the internal Express API on port `4000`.

In Coolify, create an Application from the public `Tarteel` repository and use:

- Branch: `main`
- Build Pack: `Dockerfile`
- Dockerfile Location: `/Dockerfile`
- Port: `3000`
- Base Directory: `/`

The application needs a PostgreSQL database reachable through `DATABASE_URL`.

### Environment variables

Set these values in the deployment environment and never commit real credentials:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma
- `AUTH_SECRET`: random secret of at least 32 characters
- `ADMIN_EMAILS`: optional comma-separated admin email allowlist
- `CLIENT_URL`: optional browser origin when the API is accessed directly; same-origin Coolify deployments can leave this unset
- `PORT`: keep `3000` unless Coolify is configured for another public port
- `API_PORT`: keep `4000` unless the internal API port must change
- `TRUST_PROXY`: set `true` when the API is behind one trusted reverse proxy, such as the Coolify proxy. Leave `false` when the API is directly exposed.

### Database migrations

Before the first production start, and on every release that introduces a Prisma migration, run:

```bash
cd server && npx prisma migrate deploy --schema=../prisma/schema.prisma
```

In Coolify this can be configured as a pre-deployment command. The command must run with `DATABASE_URL` available.

The API exposes `/api/health`, which reports both application and PostgreSQL health and is suitable for a container health check.

## Docker Compose deployment

The existing `docker-compose.prod.yml` provides a separate PostgreSQL, Express API, and Vite/Nginx web stack. The API image is built from `server/Dockerfile` and the web image from `client/Dockerfile`.

After the database is healthy, run Prisma's production migration command inside the API container:

```bash
npx prisma migrate deploy
```

The web container serves the SPA on port 80 and Nginx preserves client-side routes.

## Security notes

- Terminate TLS at Coolify's proxy or another trusted reverse proxy.
- Do not expose the internal API port `4000` publicly when using the single-container runtime.
- Use a unique production `AUTH_SECRET`; never reuse development credentials.
- Keep `DATABASE_URL`, database passwords, and admin configuration out of Git.
- Back up PostgreSQL using encrypted provider backups.
- Keep production migrations additive and review them before deployment.
- Authentication endpoints are capped at 10 requests per 15-minute window per client address, and state-changing API requests are capped at 120 per minute per client address. These guards are intentionally in-memory and are a single-instance baseline; use a shared store at the edge if Tarteel is later scaled across multiple API instances.
- If Coolify's proxy is used, enable `TRUST_PROXY=true` so request addresses are derived from the trusted proxy hop rather than collapsing all clients into the proxy address.
