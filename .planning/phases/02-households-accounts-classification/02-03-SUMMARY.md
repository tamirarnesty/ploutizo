---
phase: 02-households-accounts-classification
plan: "03"
subsystem: ui
tags: [tanstack-router, react-query, reui-datagrid, tanstack-react-table, shadcn, accounts]

# Dependency graph
requires:
  - phase: 02-households-accounts-classification
    plan: "01"
    provides: "accountsRouter with GET/POST/PATCH/DELETE endpoints, Account + OrgMember + AccountMember types"
  - phase: 02-households-accounts-classification
    plan: "02"
    provides: "sidebar shell layout (_layout.tsx), AppSidebar with /accounts nav link"
provides:
  - "/accounts route rendering AccountsTable and AccountSheet"
  - "AccountsTable: ReUI DataGrid with 6 columns (Name, Type, Institution, Last 4, Owners, Status)"
  - "AccountSheet: slide-over with Personal/Shared toggle, co-owner checkboxes, Advanced collapsible, Archive dialog"
  - "React Query hooks: useAccounts, useOrgMembers, useAccountMembers, useCreateAccount, useUpdateAccount, useArchiveAccount"
  - "GET /api/households/members endpoint for co-owner picker"
  - "GET /api/accounts/:id/members endpoint for edit-mode pre-population (D-15)"
  - "formatCurrency(cents) utility for Phase 3 transaction display"
affects:
  - 02-04-categories-tags-ui
  - 03-transactions
  - 04-settlement

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-table ^8.21.3 — direct dep in apps/web for DataGrid integration"
    - "ReUI DataGrid (@reui/data-grid) — installed via shadcn CLI with useReactTable integration"
    - "shadcn badge, collapsible, alert-dialog, checkbox, spinner, dropdown-menu, popover, select components"
  patterns:
    - "DataGrid pattern: useReactTable(getCoreRowModel) + DataGrid provider + DataGridContainer + DataGridTable"
    - "ReUI internal alias fix: @ploutizo/components/* → packages/ui/src/components/* via vite resolve.alias"
    - "ui/ re-export stubs pattern: packages/ui/src/components/ui/*.ts re-export from parent for ReUI compatibility"
    - "AccountSheet D-15 pattern: useAccountMembers(account?.id) populates co-owner checkboxes in edit mode"
    - "Mutation pattern: isEditing ? updateAccount.mutate() : createAccount.mutate() with onSuccess: onClose"

key-files:
  created:
    - apps/web/src/routes/_layout.accounts.tsx
    - apps/web/src/components/accounts/accounts-table.tsx
    - apps/web/src/components/accounts/account-sheet.tsx
    - apps/web/src/hooks/use-accounts.ts
    - apps/web/src/lib/format-currency.ts
    - packages/ui/src/components/alert-dialog.tsx
    - packages/ui/src/components/badge.tsx
    - packages/ui/src/components/checkbox.tsx
    - packages/ui/src/components/collapsible.tsx
    - packages/ui/src/components/reui/data-grid/ (full DataGrid suite)
    - packages/ui/src/components/ui/checkbox.ts
    - packages/ui/src/components/ui/spinner.ts
  modified:
    - apps/api/src/routes/households.ts
    - apps/api/src/routes/accounts.ts
    - apps/web/tsconfig.json
    - apps/web/vite.config.ts
    - apps/web/package.json
    - packages/ui/tsconfig.json
    - apps/web/src/routeTree.gen.ts

key-decisions:
  - "Used plain string headers in DataGrid ColumnDef instead of DataGridColumnHeader to avoid @ploutizo/components resolution issues"
  - "Added vite resolve.alias for @ploutizo/components to fix ReUI internal imports (Rule 3)"
  - "Created packages/ui/src/components/ui/ re-export stubs for checkbox and spinner to satisfy ReUI's expected path structure"
  - "Added @tanstack/react-table as direct dep in apps/web (was only transitively available via packages/ui)"
  - "Added @ploutizo/types path mapping to apps/web/tsconfig.json (was missing; blocked TypeScript resolution)"

patterns-established:
  - "ReUI DataGrid integration: always add vite resolve.alias for @ploutizo/components and create ui/ stubs"
  - "D-15 co-owner pre-population: useAccountMembers(account?.id ?? null) in useEffect with [account, open, existingMembers] deps"
  - "Sheet form pattern: useState-based form state, validate() fn, isEditing branch for create vs update"

requirements-completed:
  - "§2 Accounts"

# Metrics
duration: 11min
completed: 2026-04-01
---

# Phase 02 Plan 03: Accounts UI Summary

**Accounts CRUD UI: ReUI DataGrid table with 6 columns, slide-over Sheet with Personal/Shared toggle, co-owner pre-population (D-15), Archive dialog, and React Query hooks for all account mutations**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-01T18:01:05Z
- **Completed:** 2026-04-01T18:12:00Z
- **Tasks:** 2 of 2
- **Files modified:** 20+

## Accomplishments

- Built complete accounts CRUD UI: /accounts route with ReUI DataGrid table (6 columns matching spec), slide-over AccountSheet for create and edit modes
- Implemented D-15 co-owner pre-population: `useAccountMembers(account?.id ?? null)` loads existing member rows on edit, useEffect derives ownership toggle and selectedMemberIds from the loaded data
- Extended API with GET /api/households/members and GET /api/accounts/:id/members endpoints; created formatCurrency utility for Phase 3

## Task Commits

Each task was committed atomically:

1. **Task 1: React Query hooks, formatCurrency, and GET /members endpoints** - `10dfaf1` (feat)
2. **Task 2: Accounts page, DataTable, and sheet components** - `c960167` (feat)

**Plan metadata:** _(created next — final docs commit)_

## Files Created/Modified

- `apps/web/src/lib/format-currency.ts` - formatCurrency(cents: number): string via Intl.NumberFormat USD
- `apps/web/src/hooks/use-accounts.ts` - useAccounts, useOrgMembers, useAccountMembers, useCreateAccount, useUpdateAccount, useArchiveAccount
- `apps/api/src/routes/households.ts` - Added GET /members endpoint returning org members for co-owner picker
- `apps/api/src/routes/accounts.ts` - Added GET /:id/members endpoint scoped through accounts table for org isolation
- `apps/web/src/routes/_layout.accounts.tsx` - /accounts route with page heading, Add account CTA, AccountsTable, AccountSheet
- `apps/web/src/components/accounts/accounts-table.tsx` - AccountsTable with ReUI DataGrid (6 columns, empty state)
- `apps/web/src/components/accounts/account-sheet.tsx` - AccountSheet with ownership toggle, co-owner checkboxes (D-15), Advanced collapsible, Archive dialog
- `apps/web/tsconfig.json` - Added @ploutizo/types and @ploutizo/components path mappings
- `apps/web/vite.config.ts` - Added resolve.alias for @ploutizo/components (ReUI internal import fix)
- `apps/web/package.json` - Added @tanstack/react-table as direct dependency
- `packages/ui/tsconfig.json` - Added @ploutizo/components/* path mapping
- `packages/ui/src/components/ui/checkbox.ts` - Re-export stub for ReUI DataGrid compatibility
- `packages/ui/src/components/ui/spinner.ts` - Re-export stub for ReUI DataGrid compatibility
- `packages/ui/src/components/reui/data-grid/` - Full ReUI DataGrid suite installed via shadcn CLI
- `packages/ui/src/components/{alert-dialog,badge,checkbox,collapsible,...}.tsx` - shadcn components installed
- `apps/web/src/routeTree.gen.ts` - Auto-regenerated with /_layout/accounts route

## Decisions Made

- Replaced `DataGridColumnHeader` (from ReUI, uses `@ploutizo/components` alias internally) with plain string headers in ColumnDef. The column header label fallback in DataGrid reads string headers natively — same visual result without the resolution issue.
- Added `vite resolve.alias` for `@ploutizo/components` pointing to `packages/ui/src/components`. This is the correct fix for ReUI's internal path alias that doesn't match the project's standard `@ploutizo/ui/*` alias.
- Created `packages/ui/src/components/ui/` re-export stubs for `checkbox` and `spinner` — ReUI DataGrid expects these at `@ploutizo/components/ui/{name}` (standard shadcn structure with `ui/` subdirectory) but the project installs directly to `components/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @ploutizo/types path mapping to apps/web/tsconfig.json**
- **Found during:** Task 1 (use-accounts.ts creation)
- **Issue:** `import type { Account } from '@ploutizo/types'` failed TypeScript resolution — the path wasn't in apps/web/tsconfig.json paths
- **Fix:** Added `"@ploutizo/types": ["../../packages/types/src/index.ts"]` to tsconfig paths
- **Files modified:** apps/web/tsconfig.json
- **Verification:** `pnpm --filter web typecheck` shows no errors for use-accounts.ts
- **Committed in:** 10dfaf1 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed @ploutizo/components/* path resolution for ReUI DataGrid**
- **Found during:** Task 2 (accounts-table.tsx — ReUI DataGrid integration)
- **Issue:** ReUI DataGrid sub-components (data-grid-table.tsx, data-grid-column-header.tsx) import from `@ploutizo/components/reui/...` and `@ploutizo/components/ui/...` internally, but this alias didn't exist in the vite/tsconfig config
- **Fix 1:** Added `@ploutizo/components` resolve alias to vite.config.ts pointing to `packages/ui/src/components`
- **Fix 2:** Added `@ploutizo/components/*` path mapping to apps/web/tsconfig.json and packages/ui/tsconfig.json
- **Fix 3:** Created `packages/ui/src/components/ui/checkbox.ts` and `spinner.ts` re-export stubs for the `ui/` subdirectory structure ReUI expects
- **Files modified:** apps/web/vite.config.ts, apps/web/tsconfig.json, packages/ui/tsconfig.json, packages/ui/src/components/ui/checkbox.ts, packages/ui/src/components/ui/spinner.ts
- **Verification:** `pnpm build --filter web --force` exits 0; accounts bundle visible in output
- **Committed in:** c960167 (Task 2 commit)

**3. [Rule 1 - Bug] Used plain string headers instead of DataGridColumnHeader**
- **Found during:** Task 2 (accounts-table.tsx)
- **Issue:** `DataGridColumnHeader` imports from `@ploutizo/components/reui/data-grid/data-grid` — the unresolvable alias at that stage; also has complex DropdownMenu deps (column sort/pin/move) that aren't needed for accounts table
- **Fix:** Used plain string headers (`header: 'Name'`, etc.) in ColumnDef — DataGrid's `getColumnHeaderLabel()` reads these natively for the header cell label
- **Impact:** Headers render as static labels (no sort affordance), which is appropriate for this phase; sorting can be enabled later
- **Files modified:** apps/web/src/components/accounts/accounts-table.tsx
- **Committed in:** c960167 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing path mapping, 1 blocking path resolution, 1 bug fix)
**Impact on plan:** All auto-fixes necessary for build correctness. No scope creep. D-15 fully implemented as specified.

## Known Stubs

- `Owners` column in AccountsTable (`apps/web/src/components/accounts/accounts-table.tsx`, line ~62): Renders `—` for all rows. The owners column requires joining account_members with org_members to resolve display names — this is a Phase 3 enhancement when the accounts table may be refactored to include member resolution. The D-15 create/edit flow correctly handles member assignment; only the read-only display column is stubbed.

## Issues Encountered

None beyond the auto-fixed path resolution issues documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /accounts route is fully functional end-to-end: table, create, edit, archive all wired to API
- formatCurrency(cents) utility is ready for Phase 3 transaction display
- GET /api/households/members and GET /api/accounts/:id/members endpoints are available for Phase 3 (transfer flows need account member lists)
- ReUI DataGrid is installed and working — Phase 3 can use it for the transactions table with the same alias configuration

---
*Phase: 02-households-accounts-classification*
*Completed: 2026-04-01*
