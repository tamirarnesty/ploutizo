# Ploutizo — Agent Instructions

See `CLAUDE.md` for stack details, critical constraints, and developer profile.

## Cursor Cloud specific instructions

### Services overview

| Service | Port | Start command |
|---------|------|---------------|
| Web (Vite SPA) | 3000 | `pnpm --filter web dev` |
| API (Hono/Node) | 8080 | `pnpm --filter api dev` |

Both can be started together with `pnpm turbo dev` from the workspace root. Turborepo runs them concurrently.

### Required secrets (env vars)

Three `.env` files must exist — see `.env.example` in `apps/web/`, `apps/api/`, and root. Key secrets:

- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` — Clerk auth (cloud service, no local substitute)
- `DATABASE_URL` — Neon serverless Postgres connection string (cloud service, no local DB)
- `CLERK_WEBHOOK_SECRET` — Clerk webhook signing secret (API only)

Without real Clerk keys both servers start but return 500 on all routes (Clerk middleware fails). Without a real `DATABASE_URL` the API cannot reach the database.

### Lint / typecheck / test / format

All commands run via Turborepo from the workspace root:

```
pnpm turbo lint          # ESLint across all packages
pnpm turbo typecheck     # tsc --noEmit in dependency order
pnpm test                # vitest run in all packages (162 tests, all mocked — no secrets needed)
pnpm turbo format:check  # Prettier check
```

### Gotchas

- **Node version**: Must be `>=22` (`.node-version` specifies 22.14.0). The API dev script uses `node --env-file=.env` which requires Node >=20.6.
- **Package manager**: pnpm 9.15.9 (`packageManager` field). Use `corepack enable && corepack prepare pnpm@9.15.9 --activate` to match.
- **No Docker required**: All external services (Neon DB, Clerk auth) are cloud-hosted. No local containers needed.
- **Never run `npx tsc` at repo root** — it emits JS files. Always use `pnpm turbo typecheck`.
- **Lefthook pre-commit hooks** run lint, typecheck, and format:check in parallel. These are installed via the `prepare` script.
- **Tests are fully mocked** — `pnpm test` runs all 162 tests without requiring any secrets or external services.
