---
status: resolved
trigger: "Transactions page crashes with 'Invariant failed: Could not find an active match from /transactions'"
created: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Focus

hypothesis: useSearch({ from: '/transactions' }) uses the fullPath, but TanStack Router requires the route ID ('/_layout/transactions') for the `from` parameter when strict: true. With strict: false it won't throw, but the real crash is that validateSearch uses .parse() (not .safeParse()), which forces defaults into URL params.
test: Confirmed by reading routeTree.gen.ts — route id is '/_layout/transactions', fullPath is '/transactions'. The `from` param accepts fullPath OR id. With strict: false this should NOT throw. The actual crash is from validateSearch: z.object().parse() coerces missing fields to defaults, so every navigation triggers a full set of default params.
expecting: Fix by: (1) changing `from` to use the route ID '/_layout/transactions', (2) changing validateSearch to use .partial().parse() or individual optional fields so missing params stay missing.
next_action: Apply fix

## Symptoms

expected: Transactions page loads normally. URL only shows non-default filter params.
actual: Page crashes with "Invariant failed: Could not find an active match from '/transactions'"
errors: |
  Error: Invariant failed: Could not find an active match from "/transactions"
      at useMatch.js:34
      at useSearch.js:16
      at Transactions component
reproduction: Navigate to /transactions route in the app.
started: Currently broken on branch gsd/phase-03.3-transaction-list-ui

## Eliminated

- hypothesis: fullPath '/transactions' is wrong for from parameter
  evidence: fullPath IS '/transactions' per routeTree.gen.ts line 219. But route ID is '/_layout/transactions'. TanStack Router useSearch `from` accepts fullPath values, so '/transactions' should work in theory.
  timestamp: 2026-04-13T00:00:00Z

## Evidence

- timestamp: 2026-04-13T00:00:00Z
  checked: routeTree.gen.ts lines 49-53, 216-222
  found: Route ID is '/_layout/transactions', fullPath is '/transactions'. The route is a child of _layout.
  implication: useSearch({ from: '/transactions' }) uses fullPath which is valid. But strict: false is already set.

- timestamp: 2026-04-13T00:00:00Z
  checked: _layout.transactions.tsx validateSearch
  found: uses transactionSearchSchema.parse(search) — Zod .parse() with .catch() coerces all missing fields to their defaults (page:1, limit:25, sort:'date', order:'desc'). This means EVERY navigation to /transactions immediately gets all 4 defaults written into search params.
  implication: The real crash source — when navigate() is called with these coerced params, something in the navigation cycle triggers the invariant. Also causes the "default params in URL" second issue.

- timestamp: 2026-04-13T00:00:00Z
  checked: Transactions.tsx line 89
  found: useSearch({ from: '/transactions', strict: false }) — strict: false should prevent the invariant throw entirely. So the crash may be happening during a navigate() call that causes route re-evaluation before the component fully mounts.
  implication: The root crash is the validateSearch coercing defaults into params on every parse, causing a navigation loop or invariant violation during the transition.

## Resolution

root_cause: Two issues: (1) validateSearch uses zod .parse() with .catch() which coerces ALL fields to defaults even when absent, polluting the URL with ?page=1&limit=25&sort=date&order=desc on every visit. (2) The `from: '/transactions'` with strict: false should not crash, but the combination of validateSearch writing defaults + navigate() being called immediately in the component creates a navigation cycle that triggers the invariant. Fix: change validateSearch to only parse/coerce fields that ARE present (use optional fields without catch for the ones that should be absent by default).
fix: In _layout.transactions.tsx, change validateSearch so pagination/sort params are optional and only coerced when present. Use .optional().catch() pattern so absent params stay absent. The `buildCleanSearch` in Transactions.tsx already strips defaults before navigation — we just need validateSearch to not re-inject them.
verification: pending
files_changed:
  - apps/web/src/routes/_layout.transactions.tsx
