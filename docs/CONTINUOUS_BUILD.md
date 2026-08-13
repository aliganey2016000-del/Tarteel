# Continuous Build Notes

Tarteel is developed incrementally against `main`.

## Verification priorities

1. Client unit tests and production build.
2. Server tests, Prisma generation, and syntax checks.
3. Production container build and health probe.
4. Responsive/accessibility regression checks for reader navigation.
5. Security and deployment hardening without committing credentials.

## External Quran data

The reader uses configurable Quran and audio providers. Keep provider URLs and optional future integrations in environment configuration; never commit API keys or private credentials.
