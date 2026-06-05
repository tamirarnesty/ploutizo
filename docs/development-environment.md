# Development environment

Guidance for local development and Cursor Cloud agents.

## Services

| Service         | Port | Start command           |
| --------------- | ---- | ----------------------- |
| Web (Vite SPA)  | 3000 | `pnpm --filter web dev` |
| API (Hono/Node) | 8080 | `pnpm --filter api dev` |

Both can be started together with `pnpm turbo dev` from the workspace root. Turborepo runs them concurrently.

## Required secrets (env vars)

Three `.env` files must exist — see `.env.example` in `apps/web/`, `apps/api/`, and the repo root. Key secrets:

- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` — Clerk auth (cloud service, no local substitute)
- `DATABASE_URL` — Neon serverless Postgres connection string (cloud service, no local DB)
- `CLERK_WEBHOOK_SECRET` — Clerk webhook signing secret (API only)

Without real Clerk keys both servers start but return 500 on all routes (Clerk middleware fails). Without a real `DATABASE_URL` the API cannot reach the database.

## Lint, typecheck, test, format

All commands run via Turborepo from the workspace root:

```
pnpm turbo lint          # ESLint across all packages
pnpm turbo typecheck     # tsc --noEmit in dependency order
pnpm test                # vitest run in all packages (all mocked — no secrets needed)
pnpm turbo format:check  # Prettier check
```

## Clerk webhook tunnel (svix)

For Clerk webhooks to reach the local API during development, run svix in a separate terminal **after** the API is started:

```
svix listen http://localhost:8080/webhooks/clerk
```

The Clerk dashboard webhook endpoint is set to `https://play.svix.com/in/c_DXiiPoSOVJFMDsOp1h5EKOWjg6z/`. Install the svix CLI first (`curl -sL https://github.com/svix/svix-webhooks/releases/download/v1.92.2/svix-cli-installer.sh | bash`, then add `$HOME/.svix/bin` to `PATH`).

Webhooks are only needed when testing flows that trigger Clerk events: sign-up, login/logout, org (household) creation/update, member invite/join. See `apps/api/src/services/webhooks.ts` for the full event list.

## Test credentials

Use Clerk test email mode ([docs](https://clerk.com/docs/guides/development/testing/test-emails-and-phones.md)):

- **Email:** `cursor+clerk_test@example.com`
- **Verification code:** `424242` (persistent, no real email sent)

## Gotchas

- **Node version:** Must be `>=22` (`.node-version` specifies 22.14.0). The API dev script uses `node --env-file=.env`, which requires Node >=20.6.
- **Package manager:** pnpm 9.15.9 (`packageManager` field). Use `corepack enable && corepack prepare pnpm@9.15.9 --activate` to match.
- **No Docker required:** All external services (Neon DB, Clerk auth) are cloud-hosted. No local containers needed.
- **Never run `npx tsc` at repo root** — it emits JS files. Always use `pnpm turbo typecheck`.
- **Lefthook pre-commit hooks** run lint, typecheck, and format:check in parallel. Installed via the `prepare` script.
- **Tests are fully mocked** — `pnpm test` runs without requiring secrets or external services.
- **Cloud agent .env creation:** Secrets are injected as environment variables. Create `apps/web/.env` and `apps/api/.env` from those env vars before starting dev servers (see `.env.example` files for required keys).
