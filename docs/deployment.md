# Production deployment

Tarteel includes a Docker Compose production stack with PostgreSQL, the Express API, and the Vite-built React SPA.

## Required environment

Set these values in the deployment environment and do not commit them:

- POSTGRES_PASSWORD: strong database password
- AUTH_SECRET: random secret of at least 32 characters
- ADMIN_EMAILS: optional comma-separated admin email allowlist
- CLIENT_URL: public browser origin
- POSTGRES_DB / POSTGRES_USER: optional database names

## Start

Run the production Compose stack with the environment variables configured by your deployment platform. The API image is built from `server/Dockerfile` and the web image from `client/Dockerfile`.

After the database is healthy, run Prisma's production migration command inside the API container: `npx prisma migrate deploy`.

The API exposes `/api/health` for service/database health checks. The web container serves the SPA on port 80 and Nginx preserves client-side routes.

## Security notes

- Terminate TLS at a reverse proxy or load balancer.
- Restrict the API port from the public internet when it is routed through a proxy.
- Use a unique production AUTH_SECRET; never reuse development credentials.
- Back up PostgreSQL using encrypted provider backups.
