# Code Standards & Patterns

Working reference for code conventions. Will be promoted to `CLAUDE.md` once settled.

---

## File Naming

Files are named after the primary export they contain, using the same casing as the export.

| Type                 | Casing                     | Example file           | Example export                      |
| -------------------- | -------------------------- | ---------------------- | ----------------------------------- |
| Component            | PascalCase                 | `AccountSheet.tsx`     | `export const AccountSheet = ...`   |
| Hook                 | camelCase                  | `useGetAccounts.ts`    | `export const useGetAccounts = ...` |
| Util / pure function | camelCase                  | `formatCurrency.ts`    | `export const formatCurrency = ...` |
| Route file           | TanStack Router convention | `_layout.accounts.tsx` | TanStack-generated                  |

One primary export per file. If a file has a secondary utility tightly coupled to its primary export (e.g. `renderLucideIcon` alongside `LucideIconPicker`), that's acceptable; anything independently useful gets its own file.

---

## Routing

### File-based routing — flat dot-notation only

All routes use TanStack Router's flat dot-notation. No directory-based routes.

```
routes/
  __root.tsx
  index.tsx
  onboarding.tsx
  sign-in.$.tsx
  sign-up.$.tsx
  _layout.tsx
  _layout.dashboard.tsx
  _layout.accounts.tsx
  _layout.settings.tsx
  _layout.settings.categories.tsx
  _layout.settings.household.tsx
  _layout.settings.merchant-rules.tsx
```

**Rules:**
- `.` separates route segments (maps to `/` in the URL)
- `_` prefix = pathless layout route (contributes no URL segment)
- `$` = dynamic segment
- `__root.tsx` is the app root — do not rename

### Route files are shells only

Route files contain only the `Route` export. All UI logic — including page-level state — lives in the page component in `src/components/[feature]/`.

```tsx
// routes/_layout.accounts.tsx
import { Accounts } from "@/components/accounts/Accounts"

export const Route = createFileRoute("/_layout/accounts")({
  component: Accounts,
})
```

The page component owns page-level state, sub-components, and layout:

```tsx
// components/accounts/Accounts.tsx
export const Accounts = () => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  // ...
  return (
    <div className="space-y-6">
      <AccountsHeader onAddClick={handleAddClick} />
      <AccountsTable accounts={accounts} onRowClick={handleRowClick} />
      <AccountSheet key={editingAccount?.id ?? "new"} ... />
    </div>
  )
}
```

The entry component for a feature is named after the feature (e.g. `Accounts`, `Dashboard`, `Settings`) and lives at `components/[feature]/[Feature].tsx`.

### routes/ is for route files only

Components are never placed in `routes/`. Non-route files in `routes/` are processed by the router and will cause errors. Feature-specific components live in `src/components/[feature]/`.

```
src/
  routes/
    _layout.settings.tsx               ← route file only
    _layout.settings.categories.tsx    ← route file only
  components/
    settings/                          ← settings-specific components
      SettingsNav.tsx
      CategoryForm.tsx
```

### Planned cleanup

- [ ] Flatten `_layout.settings/` directory to `_layout.settings.tsx`, `_layout.settings.categories.tsx`, `_layout.settings.household.tsx`, `_layout.settings.merchant-rules.tsx`

---

## `const` Over `function`

Always use `const` arrow functions. No `function` keyword declarations.

```ts
// ✅
export const formatCurrency = (cents: number): string => { ... }
export const AccountSheet = ({ open, onClose }: Props) => { ... }

// ❌
export function formatCurrency(cents: number): string { ... }
export function AccountSheet({ open, onClose }: Props) { ... }
```

Exception: TanStack Router internally uses `function` in generated files — don't touch those.

---

## Component Structure

### One component per file

Every component is its own file. No monolithic files with multiple co-located components.

- Logical sections of a form → separate components (`AccountFormFields`, `AccountOwnershipToggle`)
- Dialogs/alerts inside a parent → separate file (`AccountArchiveDialog`)
- Table rows → separate component file plugged into the table (`AccountsTableRow`)
- Repeated label+input pairs → reusable `FormField` component with props

**Rule of thumb:** if the same JSX structure appears more than once, or if a section has its own internal state/logic, it's a component.

### Generic vs. feature-specific

If a component could reasonably be used in more than one feature, make it generic and place it in `apps/web/src/components/ui/` or `packages/ui/`. Otherwise, scope it to its feature directory (e.g. `apps/web/src/components/accounts/AccountFormFields.tsx`).

---

## Import Conventions

### Path alias `@/`

All imports use the `@/` alias rooted at `apps/web/src/`. Never use `../` or `../../` (going up directories).

```ts
// ✅
import { useGetAccounts } from "@/lib/data-access/useGetAccounts"
import { AccountSheet } from "@/components/accounts/AccountSheet"

// ❌
import { useGetAccounts } from "../../lib/data-access/useGetAccounts"
```

**Exception:** imports within the same directory use `./` relative imports.

```ts
// ✅ (same directory)
import { AccountFormFields } from "./AccountFormFields"

// ❌ (going up)
import { formatCurrency } from "../lib/formatCurrency"
```

---

## Data Access (React Query)

### Directory: `@/lib/data-access/`

All server-state hooks live in `apps/web/src/lib/data-access/`. Each resource operation gets its own file.

### File structure

Each file exports exactly:

1. A typed fetch function (named `fetch[Resource]`)
2. A `useQuery` or `useMutation` hook wrapper (named `use[Verb][Resource]`)

```ts
// useGetAccounts.ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { apiFetch } from "@/lib/queryClient"
import type { Account } from "@ploutizo/types"

export const fetchAccounts = async (includeArchived = false): Promise<Array<Account>> => {
  const qs = includeArchived ? "?include=archived" : ""
  const r = await apiFetch<{ data: Array<Account> }>(`/api/accounts${qs}`)
  return r.data
}

export const useGetAccounts = (includeArchived = false): UseQueryResult<Array<Account>> => {
  return useQuery({
    queryKey: ["accounts", { includeArchived }],
    queryFn: () => fetchAccounts(includeArchived),
  })
}
```

### Naming scheme

| Operation      | Hook name           | File name              |
| -------------- | ------------------- | ---------------------- |
| Read (list)    | `useGetAccounts`    | `useGetAccounts.ts`    |
| Read (single)  | `useGetAccount`     | `useGetAccount.ts`     |
| Create         | `useCreateAccount`  | `useCreateAccount.ts`  |
| Update         | `useUpdateAccount`  | `useUpdateAccount.ts`  |
| Archive/Delete | `useArchiveAccount` | `useArchiveAccount.ts` |

### Test colocation

Test files live next to their source file with the same name:

```
lib/data-access/
  useGetAccounts.ts
  useGetAccounts.spec.ts
```

### Cache invalidation

Mutation hooks use `useQueryClient()` to invalidate queries after mutations. `QueryClientProvider` is required at the app root (see `.planning/notes/tech-debt.md` — fix this before making other changes).

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/queryClient"
import type { Account, CreateAccountBody } from "@ploutizo/types"

export const createAccount = async (body: CreateAccountBody): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>("/api/accounts", { method: "POST", body: JSON.stringify(body) })
  return r.data
}

export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSettled: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}
```

---

## React Patterns

### Avoid `useEffect` for derived state

Use React primitives instead:

- **Derived values** → `useMemo` or computed inline (no state + effect)
- **Event-driven side effects** → handler functions, not effects
- **External subscriptions** → React 19 `use()` or library-provided hooks
- **Form population on open** → prefer controlled components with `key` prop to reset state, or pass initial values as props and initialize with `useState(initialValue)`

```tsx
// ❌ useEffect to sync form state
useEffect(() => {
  if (account) setName(account.name)
}, [account])

// ✅ derive or key-reset
const AccountSheet = ({ account, ...}: Props) => {
  // Reset all state when `account` identity changes via key prop at the call site:
  // <AccountSheet key={account?.id ?? "new"} account={account} ... />
  const [name, setName] = useState(account?.name ?? "")
  ...
}
```

### `use()` for async data in React 19

Prefer `use(promise)` over `useEffect` + `useState` for reading async values when React 19's Suspense boundary is appropriate.

---

## i18n / Text

> **Tabled.** Library chosen: `react-i18next`. Implementation deferred to a dedicated phase.

All user-visible strings will go through `react-i18next`'s `useTranslation` hook. No hardcoded string literals in JSX outside of the translation layer.

```tsx
// ❌
<Button>Add account</Button>

// ✅
const { t } = useTranslation("accounts")
<Button>{t("addAccount")}</Button>
```

Strings are defined in locale JSON files keyed by feature namespace (e.g. `public/locales/en/accounts.json`). This keeps copy changes in one place and makes future localisation straightforward.

---

## Planned Refactors

These standards apply to new code immediately. Existing code should be migrated opportunistically as files are touched.

- [x] Rename all hook/component/util files to match export name casing
- [x] Move all hooks from `apps/web/src/hooks/` to `apps/web/src/lib/data-access/`, one file per operation
- [x] **Fix first:** Add `<QueryClientProvider>` to `__root.tsx` (see `.planning/notes/tech-debt.md`)
- [x] Flatten `_layout.settings/` directory to flat dot-notation route files
- [x] Strip route files down to `Route` export only; move page components to `components/[feature]/[Feature].tsx`
- [x] Rename `use[Resource]` hooks to `useGet[Resource]` / `useCreate[Resource]` etc.
- [x] Replace `useEffect`-based form population in `AccountSheet` with `key` prop pattern
- [ ] Adopt `react-i18next`; wrap all string literals
