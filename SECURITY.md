# Security

## Secrets

- Copy `.env.example` to `.env` and keep `.env` out of version control.
- Rotate any API key that was ever stored in a shared environment.
- `OPENAI_API_KEY` is optional; the dashboard does not call OpenAI today.

## Evaluator environment variables

- Users may store API keys in the `evaluators.env` JSON column.
- List/detail API responses **redact** values for keys matching `key`, `secret`, `token`, `password`, or `credential`.
- `GET /api/evaluators/export-scenario` intentionally includes real env values in `scenario.toml` — treat downloads as sensitive.

## Local development

- Docker Compose uses `postgres:postgres` for the bundled Postgres service only.
- Do not use default credentials in production.

## Logging

- API request logs record method, path, status, and duration only (no response bodies).
