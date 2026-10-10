# React improvement plans

Baseline React Doctor 0.9.17 on `7eae72e` (full scan):

| Scope                     | Score | Label      | Errors | Warnings |
| ------------------------- | ----- | ---------- | ------ | -------- |
| Workspace (worst package) | 42    | Critical   | 16     | 134      |
| `packages/ui`             | 42    | Critical   | 2      | 77       |
| `apps/web`                | 65    | Needs work | 14     | 57       |

The workspace score is the lower package score. These three plans are the highest-leverage confirmed fixes in `packages/ui`.

| Plan                                                                       | Status | Order | Depends on | Why this one                                                                                                            |
| -------------------------------------------------------------------------- | ------ | ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| [001-sortable-unconditional-hooks.md](001-sortable-unconditional-hooks.md) | DONE   | 1     | none       | P0 `rules-of-hooks`. Drag overlay can attach hook state to the wrong `useRender`.                                       |
| [002-data-grid-stable-header-keys.md](002-data-grid-stable-header-keys.md) | DONE   | 1     | none       | P2 index keys on headers. Column reorder reuses the wrong header cell. Also memoizes the drag-row context in that file. |
| [003-memoize-ui-context-values.md](003-memoize-ui-context-values.md)       | DONE   | 1     | none       | P2 inline context values on chart, date range, filters, and toggle group.                                               |

After, on this branch:

| Scope                     | Score | Label      | Errors | Warnings |
| ------------------------- | ----- | ---------- | ------ | -------- |
| Workspace (worst package) | 57    | Critical   | 14     | 118      |
| `packages/ui`             | 57    | Critical   | 0      | 61       |
| `apps/web`                | 65    | Needs work | 14     | 57       |

Files do not overlap. Run them in parallel.

## Missed opportunities

Not in this batch. They add capability or sit outside the score bottleneck:

- `MoneyLocaleProvider` (`apps/web/src/lib/money/money-locale.tsx:26`) builds `{ ...defaultMoneyLocale, ...value }` on every `AppShell` render. Memoize it once the UI package is no longer the worst score.
- `PendingInputFlushProvider` (`apps/web/src/lib/money/pending-input-flush.tsx:42`) does the same around transaction, import-review, and settle forms.
- `useReversibleThemeToggle` sets `mounted` in an effect (`packages/ui/src/hooks/use-reversible-theme-toggle.ts:28`), so the theme icon can flash after first paint. A `useSyncExternalStore` read would remove that, and it needs a hydration check before editing.
