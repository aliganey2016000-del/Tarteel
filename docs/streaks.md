# Streaks and activity

Tarteel records one `ActivityDay` per user and UTC calendar day. The marker is idempotent, so repeated reading/progress events on the same day do not inflate the streak.

## API

Authenticated clients can use:

- `POST /api/activity` — record an activity day explicitly. The request body is optional.
- `GET /api/streaks` — return `currentStreak`, `longestStreak`, `activeToday`, `totalActiveDays`, and the most recent 30 activity dates.

Reading progress updates and daily goal progress automatically record activity, so clients do not need to call `POST /api/activity` for those flows.

## Time boundary

The first implementation uses UTC calendar days. This keeps streak calculations deterministic across server regions. A future profile-timezone setting can move the boundary to the learner's local timezone without changing the data model.

## Database

Apply the migration with:

```bash
cd server
npx prisma migrate deploy --schema=../prisma/schema.prisma
```
