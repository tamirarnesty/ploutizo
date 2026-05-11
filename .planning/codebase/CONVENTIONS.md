# Coding Conventions

**Analysis Date:** 2026-05-11

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `CategoryForm.tsx`, `TransactionsTable.tsx`
- React hooks: camelCase `.ts` prefixed with `use` — `useCreateTransaction.ts`, `useGetAccounts.ts`
- API routes: kebab-case `.ts` — `merchant-rules.ts`, `settlements.ts`
- API services: kebab-case `.ts` matching route name — `services/transactions.ts`
- API query helpers: kebab-case in `lib/queries/` — `lib/queries/transactions.ts`
- Test files: `__tests__/` subdirectory with `.test.ts` suffix — `__tests__/transactions.test.ts`
- Exception: co-located tests allowed in `apps/web/src/lib/` — `lrm.test.ts` next to `lrm.ts`

**Functions and hooks:**
- camelCase for all functions and hooks — `createTransaction`, `validateSplitSum`, `useAppForm`
- Data-access mutation hooks: `use` + verb + noun — `useCreateTransaction`, `useDeleteTag`
- Data-access query hooks: `use` + `Get` + noun — `useGetAccounts`, `useGetTransactions`
- Route handlers: thin inline arrow functions on router — `transactionsRouter.post('/', handler)`
- Service functions: named exports, no class wrappers — `export async function createTransaction(...)`

**Variables:**
- camelCase — `orgId`, `rawPage`, `tagIdsArr`
- Constants: camelCase (no ALL_CAPS) — `VALID_ACCOUNT_ID` is test-file-only convention for UUID literals

**Types and interfaces:**
- `interface` for object shapes with multiple fields — `interface TransactionRow { ... }`
- `type` for aliases, unions, and computed types — `export type AppEnv = { Variables: { orgId: string } }`
- `T[]` array syntax enforced by ESLint — never `Array<T>`
- Exported Zod inferred types: `z.infer<typeof schema>` — e.g., `CreateTransactionInput`
- Hono context type: `AppEnv` from `apps/api/src/types.ts` applied to all sub-routers

**Exports:**
- Named exports only — no default exports anywhere in the codebase
- Exception: `Route` is TanStack Router convention for file routes — `export const Route = createFileRoute(...)`

## Code Style

**Formatter:** Prettier

**Key settings (`.prettierrc`):**
- `singleQuote: true`
- `semi: true`
- `tabWidth: 2`
- `trailingComma: "es5"`
- `printWidth: 80`
- `endOfLine: "lf"`
- Tailwind class sorting via `prettier-plugin-tailwindcss` using `cn` and `cva` as sort functions

**Linting:** ESLint with `@tanstack/eslint-config` base

**Key rules (all apps/packages):**
- `import/extensions: ['error', 'never']` — bare specifiers only, no `.js`/`.ts` on relative imports
- Exception: TanStack Router auto-generated `.gen.ts` files — `pattern: { gen: 'always' }`
- `@typescript-eslint/array-type: ['error', { default: 'array' }]` — enforces `T[]` over `Array<T>`

## Import Organization

**Order (no strict enforcer, observed pattern):**
1. External packages (`hono`, `@tanstack/react-query`, `zod`)
2. Internal workspace packages (`@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/ui/...`)
3. Internal relative imports (`../lib/errors`, `./queries`)
4. `import type` statements grouped at the end of their block

**Path aliases (apps/web):**
- `@/` maps to `apps/web/src/` — used for cross-directory absolute imports
- Example: `import { apiFetch } from '@/lib/queryClient'`
- Workspace packages use their package name: `@ploutizo/ui/components/button`

**No extensions on relative imports** — `'../lib/errors'` not `'../lib/errors.ts'`

## Error Handling

**API (apps/api) — throw-and-catch pattern:**
- Services throw `DomainError` or `NotFoundError` from `apps/api/src/lib/errors.ts`
- `DomainError(statusCode, message, code?)` — base class for all domain errors
- `NotFoundError(message)` — subclass with fixed 404 status and `'NOT_FOUND'` code
- `app.onError()` in `apps/api/src/index.ts` maps all thrown errors to JSON responses
- Response shape: `{ error: { code: string, message: string } }`
- Routes do NOT catch errors — only `onError` handles them (except explicit `DomainError` throws for inline 400s)

**Validation errors:**
- `appValidator()` in `apps/api/src/lib/validator.ts` wraps `@hono/zod-validator`
- Returns `{ error: { code: 'VALIDATION_ERROR', errors: ZodIssue[] } }` on failure
- Routes access validated data via `c.req.valid('json')` — fully typed

**Client (apps/web) — TanStack Query pattern:**
- `apiFetch` throws the parsed error JSON on non-ok responses
- Mutation hooks handle errors in `onError` callbacks using `toast.error()`
- No try/catch in components — errors surface via `isError` from `useQuery`/`useMutation`

## Logging

**Framework:** `console.error` only

**Pattern:** Single usage in `apps/api/src/index.ts` for unhandled errors:
```ts
console.error('[API] Unhandled error:', err);
```
- Prefix `[API]` identifies the source
- Only unhandled (unexpected) errors are logged — domain errors are not logged

## Comments

**When to comment:**
- Document non-obvious constraints with design doc references: `// Per D-03, D-04`
- Explain intent of mocks in tests: `// Mock @ploutizo/db so no real DB calls happen`
- Explain Pitfall notes inline: `// Pitfall 2`, `// Pitfall 5`
- Note deferred work with phase tags: `// TODO(03.4-deferred): ...`
- Comment middleware ordering rationale: `// Invariant middleware order: CORS → Clerk → tenant guard`

**JSDoc/TSDoc:** Not used — inline comments preferred for functions, type signatures are self-documenting

## Function Design

**Size:** Route handlers are thin — they call service functions and return JSON. No business logic in routes.

**Parameters:**
- Services take `(orgId: string, data: ...)` as first two params — `orgId` always first
- Query functions in `lib/queries/` take plain typed params, return Drizzle promises

**Return values:**
- Async functions return `Promise<T | null>` when the item may not exist (soft-delete pattern)
- Validators return `string | null` — error message or `null` for valid
- Services throw errors rather than returning error discriminants (avoid `neverthrow` Result type in service layer — `neverthrow` is installed but not used in services)

## Module Design

**Exports:**
- Routes export a single router constant: `export { transactionsRouter }`
- Services export individual named functions
- Packages use barrel `index.ts` with `export * from './module'`

**Barrel files:**
- `packages/validators/src/index.ts` — re-exports all validator modules
- `apps/web/src/lib/data-access/*/index.ts` — re-exports all hooks for a domain
- Used freely for internal imports; external packages imported directly (not via barrel)

## React-Specific Conventions

**Forms:** Always use `useAppForm` from `@ploutizo/ui/components/form` (TanStack Form + Zod). Never `useState` for form fields. Schema declared in `@ploutizo/validators`, passed to `validators.onSubmit`.

**Data fetching:** All server state via TanStack Query hooks in `apps/web/src/lib/data-access/`. Never raw `fetch()` in components. All HTTP calls go through `apiFetch` from `apps/web/src/lib/queryClient.ts`.

**Performance hooks:** `useCallback` for event handlers passed to children. `useMemo` for derived data in lists (columns, filter configs). Primitive values used as effect deps, not object refs.

**No `forwardRef`:** React 19 project — pass `ref` as a regular prop. Do not use `forwardRef` in new or refactored components in `apps/web`.

**Conditional rendering:** Ternary operators preferred over `&&` when false branch should render nothing.

---

*Convention analysis: 2026-05-11*
