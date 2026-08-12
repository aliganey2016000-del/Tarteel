# Admin foundation

Tarteel now exposes a protected operational dashboard at `/admin`.

## Access

The server authorizes the dashboard through the existing bearer token and `User.role === ADMIN` check. New accounts are assigned `ADMIN` only when their normalized email is listed in the server-side `ADMIN_EMAILS` environment variable. Never put administrator credentials or secrets in the repository.

## Dashboard

The dashboard currently reports:

- total users
- total bookmarks
- total goals
- total recitation sessions
- recent accounts with non-sensitive activity counts

The API endpoints are:

- `GET /api/admin/stats`
- `GET /api/admin/users?limit=50`

Both require authentication and administrator authorization. The server returns `403` to authenticated non-admin users and does not expose password hashes or authentication tokens.

## Production notes

Keep `ADMIN_EMAILS` and `AUTH_SECRET` in Coolify environment variables. Use a long random `AUTH_SECRET` (at least 32 characters). If administrator membership needs to change, update the environment configuration rather than editing application source.
