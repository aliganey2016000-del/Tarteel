# Recitation sessions

Tarteel now has a production-oriented recitation session boundary.

## Client flow

1. The user starts a session from the Memorization screen.
2. The client records elapsed session time locally while the session remains open.
3. On completion, the user can optionally record accuracy (0–100) and mistakes.
4. The completed session is persisted through `PATCH /api/recitations/:id`.
5. A completed session increments the authenticated user's `RECITE` daily goal, which also records an activity day for streak tracking.

## API

- `POST /api/recitations` — starts an authenticated session; accepts an optional `surahNumber`.
- `GET /api/recitations?limit=20` — returns the user's recent sessions.
- `PATCH /api/recitations/:id` — completes/updates a session. Duration is capped at 24 hours and accuracy is constrained to 0–100.

The current implementation intentionally does not claim speech recognition accuracy. The accuracy field is a user-entered result until an actual recitation/ASR engine is integrated.

## Future ASR integration

A speech-recognition provider can be added behind the existing session boundary. The provider should return structured metrics (recognized ayahs, confidence, mistakes, and optional timing) and never receive provider credentials from the browser. External provider configuration belongs on the server and should have a safe disabled/fallback mode.
