## Cursor Cloud specific instructions

### Environment

- Node.js 22.14.0 (pinned in `.node-version`), pnpm 9.15.9 (pinned in `package.json#packageManager`)
- nvm is installed at `$HOME/.nvm` and sourced from `~/.bashrc`

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| API (Hono) | `pnpm --filter api dev` | 8080 | Requires `apps/api/.env` with real Clerk + Neon credentials |
| Web (Vite) | `pnpm --filter web dev` | 3000 | Requires `apps/web/.env` with real Clerk credentials |
| Both | `pnpm dev` | 8080, 3000 | Runs via Turborepo |

### Required secrets (env files, not committed)

- `apps/api/.env`: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
- `apps/web/.env`: `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` (defaults to `http://localhost:8080`)
- Copy from `.env.example` in each app directory. Without valid Clerk/Neon credentials, both servers will start but all endpoints return errors.

### Key commands (see `package.json` scripts)

- Lint: `pnpm turbo lint`
- Typecheck: `pnpm turbo typecheck`
- Test: `pnpm test` (162 tests across api, web, validators, db)
- Build: `pnpm turbo build`
- DB migrations: `pnpm db:push` or `pnpm db:migrate` (needs `DATABASE_URL` in env)

### Gotchas

- The API server starts silently (no console.log on boot). Verify it's running with `curl http://localhost:8080/health`.
- Pre-commit hooks (lefthook): lint, typecheck, format:check run in parallel. In Cloud Agent VMs, lefthook may warn about `core.hooksPath` conflicts — this is benign.
- Never run `npx tsc` from repo root — use `pnpm turbo typecheck`. Direct `tsc` emits JS files.
- No Docker required — all external services (Neon DB, Clerk) are cloud-hosted SaaS.
