# Progress dashboard

Tarteel now exposes `/progress` as an authenticated learning dashboard backed by the existing Prisma/PostgreSQL goals and activity models.

## Daily goals

The dashboard loads the three server-managed goal types:

- `MEMORIZE` — new ayahs to learn.
- `REVIEW` — saved ayahs to review.
- `RECITE` — focused recitation minutes.

Users can update the target and completed value for the current day. The server validates both values and persists them with the user's account.

## Streaks

The dashboard also reads `/api/streaks` and shows current streak, best streak, total active days, and recent activity. Reading progress already records an activity day, so the dashboard reflects real reader usage rather than mock data.

The page requires an existing Tarteel auth token and does not expose or persist any additional credentials.
