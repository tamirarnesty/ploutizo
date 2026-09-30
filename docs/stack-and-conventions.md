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
- All data fetching in `apps/web` uses TanStack Query hooks from `apps/web/src/lib/data-access/`. Never add raw `fetch()` calls to components. All API requests go through `apiFetch` (with a response schema) or `apiSend`, never raw `fetch()` — see [Response contracts](#response-contracts).
- Form state always uses `useAppForm` from `@ploutizo/ui/components/form` (TanStack Form + Zod). Never use `useState` for form field values.
- `packages/db` uses `@neondatabase/serverless` WebSocket Pool (not postgres.js). Set `neonConfig.webSocketConstructor` before constructing the Pool.
- Client-side persistence in `apps/web` must use Zustand stores in `@/lib/prefs/` for localStorage-backed prefs and `@/lib/prefs/sessionPref` for ephemeral sessionStorage prefs. Never call `localStorage`/`sessionStorage` directly in components or hooks. Exception: theme via next-themes. Key naming: `ploutizo:{feature}:{preference}`.
- Exception: a preference the server must read for the first render (so SSR matches the client) is a cookie, read with `createIsomorphicFn` (`getCookie` on the server, `document.cookie` on the client) and written from one module per feature. Example: the dashboard period in `@/lib/dashboard-period/cookie.ts`.
- API middleware order is invariant: **CORS → request telemetry → Clerk → tenant guard** (see `apps/api/src/index.ts`). Request telemetry owns `X-Request-Id` and one wide `api.request.complete` record per request.

## Response contracts

Every API response the web reads is validated at runtime against a Zod schema.

- **`apiFetch(path, schema, options?)`** (`apps/web/src/lib/queryClient.ts`) requires a schema and returns its parsed output (`z.output<typeof schema>`); unknown keys are stripped. There is no untyped or generic-cast variant.
- **`apiSend(path, options?)`** is for calls whose body the caller does not use, including 204s. It resolves to `void` and never reads the body.
- **Schemas live in `@ploutizo/validators`**, in the domain file beside that domain's request schemas (`categorySchema` in `categories.ts`, `importDraftSchema` in `imports.ts`, …). They describe the wire exactly: ISO-8601 instants (`isoTimestampSchema`), `yyyy-MM-dd` calendar dates (`z.iso.date()`), integer cents, enums from the shared `*_VALUES` tuples, and `z.string()` for ids (orgs, invitations, and bank references are not UUIDs).
- **Envelopes:** wrap `{ data }` bodies with `dataEnvelope(schema)`; model bare bodies (`{ accounts }`, list pages, the import-draft `kind` union) as their own schema.
- **One source of truth for types:** response types are `z.infer` exports from `@ploutizo/validators`; do not declare parallel interfaces in `apps/web` or `@ploutizo/types`. Exception: wire types that `@ploutizo/utils` consumes (`MemberIdentity`, `ImportDraftRow`, `ImportReviewRow`, `MatchTargetFact`, `ImportRowSnapshot` and its parts) stay as interfaces in `@ploutizo/types`, because validators depends on utils. Their schemas call `assertSchemaOutput<typeof schema, Interface>()`, which fails typecheck when either side drifts — including an interface field the schema would silently strip.
- **Contract failures:** a body that fails its schema throws `ApiResponseContractError` (web-local; `kind: 'malformed'`, method, path, status, Zod issues). It is deterministic, so the working-set `QueryClient` retry policy (`shouldRetryApiRequest`) does not retry it, and `classifyApiOutcome` treats it as reportable for Error Tracking ([ADR 0006](adr/0006-cross-stack-telemetry.md)). The path and issues are diagnostics only — never put them in telemetry attributes or UI; `getApiErrorMessage` returns the caller's generic fallback for it.

## Base components

- **Default:** Prefer usage-site overrides (`className`, wrappers, exposed props such as `DataGrid`’s `onRowClick`) before editing shadcn-generated files or `packages/ui/src/components/reui/`.
- **Shadcn-generated files:** Do not edit unless regenerating from the CLI; override at the usage site instead.
- **Menu destructive styling (Ploutizo fork):** Popover shells (`dropdown-menu`, `select`, `combobox`, `context-menu` content) do not use global `**:data-[variant=destructive]` overrides. Use per-item `variant="destructive"` on `DropdownMenuItem` / `ContextMenuItem`. Re-merge intentionally after shadcn CLI regen.
- **`DataGrid.renderRowContextMenu`:** The viewport trigger uses `select-text` so users can still select cell text; right-click/long-press opens app row actions and suppresses the native browser menu inside the table trigger. Document product tradeoffs in the PR when adding a grid context menu.
- **ReUI (`packages/ui/src/components/reui/`):** Edits are allowed for **product-agnostic** grid/primitive capabilities (typed public props, no app-specific copy or domain types). Document the API briefly at the prop/site of change and add a bullet under **Ploutizo fork capabilities** in [docs/research/tanstack-table-v9-reui-grid-migration.md](research/tanstack-table-v9-reui-grid-migration.md) so registry reinstalls can re-merge.
- **Chart (`packages/ui/src/components/chart.tsx`):** Ploutizo fork adds `ChartTooltipContent` `valueFormatter` (value-only tooltip formatting) and `indicatorColor` (per-item dot colour, `(item) => string | undefined`, falling back to `color`, the item's fill, then its series colour) and keeps shadcn's `function` declarations (vendored file, exempt from the arrow-function rule). Re-merge intentionally after shadcn CLI regen. Composition and customization: [STANDARDS.md § UI library composition](STANDARDS.md#ui-library-composition-and-customization).
- **Date range picker (`packages/ui/src/components/date-range-picker.tsx`):** Ploutizo composition of `Popover` + `Calendar` (range mode) + `Button`, not a shadcn registry file. Edits to the pending range stay local until Apply; Cancel or dismiss discards them. Used by the dashboard period selector and the transactions date filter.
- Leave a comment explaining any non-obvious override at usage sites.

## Build and type checking

- Never invoke tools directly via `npx` (e.g. `npx tsc`, `npx vitest`, `npx jest`). Always go through package scripts so the correct flags and config are used.
- Every app/package exposes the shared quality scripts (`lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`) so root `pnpm turbo …` tasks propagate across the workspace.
- Type checking: `pnpm turbo typecheck` (runs `tsc --noEmit` in all packages in dependency order). Never run `npx tsc` from the repo root — it emits JS files.
- Tests: `pnpm test` or `pnpm --filter <package> test`.
