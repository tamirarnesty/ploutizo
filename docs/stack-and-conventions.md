# Stack and conventions

## Stack

- **Framework:** TanStack Start + TanStack Router (React SPA, not RSC)
- **UI:** shadcn/ui + ReUI components from `packages/ui`
- **Data fetching:** TanStack Query (all server state)
- **Forms:** TanStack Form + Zod (`useAppForm` composition hook from `packages/ui`)
- **Styling:** Tailwind CSS v4
- **Database:** Neon serverless (`@neondatabase/serverless` WebSocket Pool) + Drizzle ORM
- **Auth:** Clerk (org-based tenancy)
- **API:** Hono (`apps/api`)

## Critical constraints

- **React SPA** (TanStack Start/Router) — NOT Next.js. No RSC patterns, server actions, `React.cache()`, `next/dynamic`, `"use server"`.
- React 19 project. Pass `ref` as a regular prop — no `forwardRef` in new/refactored components in `apps/web`. Shadcn components in `packages/ui` may retain it.
- All data fetching in `apps/web` uses TanStack Query hooks from `apps/web/src/lib/data-access/`. Never add raw `fetch()` calls to components. All API requests call `apiFetch`, never raw `fetch()` directly.
- Form state always uses `useAppForm` from `@ploutizo/ui/components/form` (TanStack Form + Zod). Never use `useState` for form field values.
- `packages/db` uses `@neondatabase/serverless` WebSocket Pool (not postgres.js). Set `neonConfig.webSocketConstructor` before constructing the Pool.
- Client-side persistence in `apps/web` must use Zustand stores in `@/lib/prefs/` for localStorage-backed prefs and `@/lib/prefs/sessionPref` for ephemeral sessionStorage prefs. Never call `localStorage`/`sessionStorage` directly in components or hooks. Exception: theme via next-themes. Key naming: `ploutizo:{feature}:{preference}`.
- API middleware order is invariant: **CORS → Clerk → tenant guard** (see `apps/api/src/index.ts`).

## Base components

- Never modify components in `packages/ui/src/components/reui/` or shadcn-generated files. Override behavior at the usage site via `className` props (Tailwind arbitrary variants), wrapper elements, or exposed component props. Leave a comment explaining any non-obvious override.

## Build and type checking

- Never invoke tools directly via `npx` (e.g. `npx tsc`, `npx vitest`, `npx jest`). Always go through package scripts so the correct flags and config are used.
- Type checking: `pnpm turbo typecheck` (runs `tsc --noEmit` in all packages in dependency order). Never run `npx tsc` from the repo root — it emits JS files.
- Tests: `pnpm test` or `pnpm --filter <package> test`.
