# Ploutizo — Agent Instructions

## Critical Constraints

- **React SPA** (TanStack Start/Router) — NOT Next.js. No RSC patterns, server actions, `React.cache()`, `next/dynamic`, `"use server"`.
- Data fetching in `apps/web`: TanStack Query hooks from `apps/web/src/lib/data-access/`. Never raw `fetch()` in components.
- API requests from `apps/web`: always through `apiFetch` in `apps/web/src/lib/queryClient.ts`.
- Form state: `useAppForm` from `@ploutizo/ui/components/form`. Never `useState` for form field values.
- `packages/db`: set `neonConfig.webSocketConstructor` before constructing the Pool.
- Never modify `packages/ui/src/components/reui/` or shadcn-generated files. Override at usage site via `className`, wrappers, or exposed props. Comment non-obvious overrides.
- Never invoke tools directly via `npx` (e.g. `npx tsc`, `npx vitest`). Use package scripts.
- `npx tsc` at repo root emits JS files. Always use `pnpm turbo typecheck`.
- React 19 project. Pass `ref` as a regular prop — no `forwardRef` in new/refactored components in `apps/web`. Shadcn components in `packages/ui` may retain it.

## Cursor Cloud specific instructions

### Services

| Service | Port | Start command |
|---------|------|---------------|
| Web (Vite SPA) | 3000 | `pnpm --filter web dev` |
| API (Hono/Node) | 8080 | `pnpm --filter api dev` |

Both: `pnpm turbo dev` from workspace root.

### Required secrets

Create `apps/web/.env` and `apps/api/.env` from injected env vars (see `.env.example` files for required keys).

- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` — without real keys, all routes return 500
- `DATABASE_URL` — Neon serverless Postgres connection string
- `CLERK_WEBHOOK_SECRET` — API only

### Test credentials

Clerk test email mode:

- **Email**: `cursor+clerk_test@example.com`
- **Verification code**: `424242`

### Clerk webhook tunnel (svix)

Only needed for flows triggering Clerk events (sign-up, org creation, member invite):

```
svix listen http://localhost:8080/webhooks/clerk
```

Install: `curl -sL https://github.com/svix/svix-webhooks/releases/download/v1.92.2/svix-cli-installer.sh | bash`, then add `$HOME/.svix/bin` to `PATH`.

### Gotchas

- `drizzle-kit push` requires TTY — run in tmux, not piped.
- `turbo dev` uses TUI mode — verify servers via `curl localhost:3000` and `curl localhost:8080/health`.
- Tests are fully mocked — `pnpm test` runs without secrets.
