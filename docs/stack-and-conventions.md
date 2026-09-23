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
- **Telemetry:** Vendor-neutral `@ploutizo/telemetry` contract (typed catalog + flat operation-scoped attributes, correlation IDs, local adapters). Callers omit sensitive fields; the package does not runtime-sanitize attribute bags. Web and API adapters implement the contract separately — see [ADR 0006](adr/0006-cross-stack-telemetry.md).

## Critical constraints

- **React SPA** (TanStack Start/Router) — NOT Next.js. No RSC patterns, server actions, `React.cache()`, `next/dynamic`, `"use server"`.
- React 19 project. Pass `ref` as a regular prop — no `forwardRef` in new/refactored components in `apps/web`. Shadcn components in `packages/ui` may retain it.
- All data fetching in `apps/web` uses TanStack Query hooks from `apps/web/src/lib/data-access/`. Never add raw `fetch()` calls to components. All API requests call `apiFetch`, never raw `fetch()` directly.
- Form state always uses `useAppForm` from `@ploutizo/ui/components/form` (TanStack Form + Zod). Never use `useState` for form field values.
- `packages/db` uses `@neondatabase/serverless` WebSocket Pool (not postgres.js). Set `neonConfig.webSocketConstructor` before constructing the Pool.
- Client-side persistence in `apps/web` must use Zustand stores in `@/lib/prefs/` for localStorage-backed prefs and `@/lib/prefs/sessionPref` for ephemeral sessionStorage prefs. Never call `localStorage`/`sessionStorage` directly in components or hooks. Exception: theme via next-themes. Key naming: `ploutizo:{feature}:{preference}`.
- API middleware order is invariant: **CORS → request telemetry → Clerk → tenant guard** (see `apps/api/src/index.ts`). Request telemetry owns `X-Request-Id` and one wide `api.request.complete` record per request.

## Base components

- **Default:** Prefer usage-site overrides (`className`, wrappers, exposed props such as `DataGrid`’s `onRowClick`) before editing shadcn-generated files or `packages/ui/src/components/reui/`.
- **Shadcn-generated files:** Do not edit unless regenerating from the CLI; override at the usage site instead.
- **Menu destructive styling (Ploutizo fork):** Popover shells (`dropdown-menu`, `select`, `combobox`, `context-menu` content) do not use global `**:data-[variant=destructive]` overrides. Use per-item `variant="destructive"` on `DropdownMenuItem` / `ContextMenuItem`. Re-merge intentionally after shadcn CLI regen.
- **`DataGrid.renderRowContextMenu`:** The viewport trigger uses `select-text` so users can still select cell text; right-click/long-press opens app row actions and suppresses the native browser menu inside the table trigger. Document product tradeoffs in the PR when adding a grid context menu.
- **ReUI (`packages/ui/src/components/reui/`):** Edits are allowed for **product-agnostic** grid/primitive capabilities (typed public props, no app-specific copy or domain types). Document the API briefly at the prop/site of change and add a bullet under **Ploutizo fork capabilities** in [docs/research/tanstack-table-v9-reui-grid-migration.md](research/tanstack-table-v9-reui-grid-migration.md) so registry reinstalls can re-merge.
- Leave a comment explaining any non-obvious override at usage sites.

## Build and type checking

- Never invoke tools directly via `npx` (e.g. `npx tsc`, `npx vitest`, `npx jest`). Always go through package scripts so the correct flags and config are used.
- Every app/package exposes the shared quality scripts (`lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`) so root `pnpm turbo …` tasks propagate across the workspace.
- Type checking: `pnpm turbo typecheck` (runs `tsc --noEmit` in all packages in dependency order). Never run `npx tsc` from the repo root — it emits JS files.
- Tests: `pnpm test` or `pnpm --filter <package> test`.
