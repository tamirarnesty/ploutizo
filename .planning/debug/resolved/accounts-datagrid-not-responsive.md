---
status: resolved
trigger: "accounts-datagrid-not-responsive"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T02:00:00Z
---

## Current Focus

hypothesis: RESOLVED
test: All fixes applied and confirmed by user
expecting: n/a
next_action: archive session

## Symptoms

expected: DataGrid should be reactive to screen size — columns/layout should adjust based on viewport width per the reui.io DataGrid composition docs
actual: DataGrid is not reactive to screen size — the composition is incorrect. Page-level horizontal overflow also clips the "Add Account" button before the mobile breakpoint.
errors: No runtime errors reported — this is a UI/composition issue
reproduction: View the accounts page on different screen sizes
started: Current implementation — may never have been correctly composed

## Eliminated

- hypothesis: Missing DataGridProvider/DataGrid wrapper (DataGrid component renders a DataGridProvider internally — current code is correctly using DataGrid + DataGridContainer)
  evidence: data-grid.tsx line 238: DataGrid renders DataGridProvider internally; current AccountsTable correctly uses DataGrid as the provider wrapper
  timestamp: 2026-04-09T00:00:00Z

## Evidence

- timestamp: 2026-04-09T00:00:00Z
  checked: AccountsTable.tsx — full file
  found: useReactTable called with data, columns, getCoreRowModel only — no columnVisibility state, no onColumnVisibilityChange, no initialState for columnVisibility
  implication: TanStack Table has no way to reactively toggle column visibility; all columns always render

- timestamp: 2026-04-09T00:00:00Z
  checked: packages/ui/src/hooks/use-mobile.ts
  found: useIsMobile hook exists using matchMedia at 768px breakpoint
  implication: Project already has a media query utility that can be used for responsive column hiding

- timestamp: 2026-04-09T00:00:00Z
  checked: data-grid.tsx DataGridContext + data-grid-table.tsx
  found: DataGrid/DataGridProvider reads table.getState().columnVisibility and includes it in useMemo deps (line 167). DataGridTable renders only getVisibleLeafColumns() / getVisibleCells(). Column visibility is entirely driven by the consumer-passed table instance state.
  implication: To make the grid responsive, the consumer (AccountsTable) must manage columnVisibility state and update it in response to viewport changes, then pass it to useReactTable via state.columnVisibility + onColumnVisibilityChange

- timestamp: 2026-04-09T00:00:00Z
  checked: Tailwind v4 breakpoints (sm=640, md=768, lg=1024, xl=1280) and account columns
  found: Columns: name (always show), type (show md+), institution (show lg+), lastFour (show lg+), owners (show xl+), status/archivedAt (show sm+)
  implication: Need useState for columnVisibility, and a useEffect with window resize listener (or use useIsMobile hook) to set appropriate visibility per breakpoint

- timestamp: 2026-04-09T00:00:00Z
  checked: AccountsTable outer JSX wrapper
  found: <div className="overflow-x-auto"> wraps DataGridContainer — this masks the non-responsiveness by allowing horizontal scroll instead of hiding columns
  implication: The outer overflow-x-auto should be removed; DataGridContainer already handles its own overflow

- timestamp: 2026-04-09T01:00:00Z
  checked: _layout.tsx, _layout.accounts.tsx, Accounts.tsx, AccountsTable.tsx, TopBar.tsx, SidebarInset definition
  found: Root div has overflow-hidden. SidebarInset is a flex child with w-full flex-1 but NO min-w-0 — flex children cannot shrink below intrinsic content width without min-w-0. The main.overflow-auto inside SidebarInset only scrolls within itself; the SidebarInset flex item itself overflows the flex row container. Additionally Accounts.tsx header div (flex items-center justify-between) has no min-w-0 on the h1 child, so the "Add Account" button gets pushed out when the heading text is wide.
  implication: Two-layer layout fix needed: (1) _layout.tsx — add min-w-0 to SidebarInset wrapper; (2) Accounts.tsx — add min-w-0/shrink-0 constraints to header flex children. For AccountsTable, all columns stay visible and DataGridScrollArea already provides horizontal scroll within DataGridContainer's overflow-hidden boundary.

- timestamp: 2026-04-09T02:00:00Z
  checked: DataGridScrollArea implementation + DataGridContainer
  found: DataGridContainer uses overflow-hidden. DataGridScrollArea wraps ScrollAreaPrimitive with orientation="both" by default, rendering a horizontal scrollbar when content overflows. No extra overflow-x-auto wrapper is needed — the scroll is already handled inside the container boundary.
  implication: columnVisibility logic not needed; all columns always visible; user scrolls horizontally within the table area via the built-in scroll area

## Resolution

root_cause: Two compounding layout issues caused horizontal overflow and clipping at the page level: (1) SidebarInset in _layout.tsx is a flex child without min-w-0, so it cannot shrink below its content's intrinsic width — the root div's overflow-hidden clips this rather than scrolling it. (2) Accounts.tsx page header (flex justify-between) had no min-w-0 on h1 and no shrink-0 on the button, so at narrow widths the button was pushed out of view. The table itself was always correct — DataGridScrollArea already provides horizontal scroll within the DataGridContainer boundary; all columns always visible is the intended behavior.

fix: (1) _layout.tsx — added className="min-w-0" to SidebarInset so the flex item can shrink. (2) Accounts.tsx — added gap-3, min-w-0 truncate to h1, shrink-0 to Button. (3) AccountsTable.tsx — removed columnVisibility state, computeColumnVisibility helper, and resize useEffect that were added in error; table remains with all columns always visible, relying on DataGridScrollArea's built-in horizontal scroll.

verification: confirmed by user
files_changed: [apps/web/src/routes/_layout.tsx, apps/web/src/components/accounts/Accounts.tsx, apps/web/src/components/accounts/AccountsTable.tsx]
