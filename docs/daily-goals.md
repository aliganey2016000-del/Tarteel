# Daily goals

Tarteel creates a small set of daily goals for authenticated users when `/api/goals` is first requested for a day.

Default targets:

- `MEMORIZE`: 5
- `REVIEW`: 10
- `RECITE`: 1

The client can replace a target with `PUT /api/goals/:type`. Progress can be recorded with `PATCH /api/goals/:type/progress`.

Recording progress is capped at the goal target and also records an `ActivityDay`, so completing a goal contributes to the user's streak without requiring a separate activity request.

The defaults are intentionally conservative. They are product defaults, not religious guidance; users can change their targets.
