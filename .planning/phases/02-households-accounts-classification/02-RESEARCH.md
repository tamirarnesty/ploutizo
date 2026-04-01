# Phase 2: Households, Accounts & Classification - Research

**Researched:** 2026-03-31
**Domain:** Clerk Organizations, TanStack Router, Hono CRUD API, Drizzle ORM, shadcn/ReUI UI patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**App Shell & Sidebar**
- D-01: Sidebar uses feature sections: Dashboard, Transactions, Accounts, Settlement, Budgets, Import, Settings. Settings nests: Categories & Tags, Merchant Rules, Household.
- D-02: `<OrganizationSwitcher />` pinned at the top of the sidebar. `<UserButton />` pinned to the bottom. No header bar.
- D-03: Default landing route after authentication is `/dashboard`. Phase 2 renders a placeholder stub; full dashboard built in Phase 4+.
- D-04: Show only live nav sections — no disabled/coming-soon items for future phases. Items added to the sidebar as phases ship.
- D-05: Sidebar is fixed-width, no collapse on desktop.
- D-06: On mobile: sidebar hides off-screen; hamburger button opens it as a drawer overlay.

**First-Use / No-Org Flow**
- D-07: Primary sign-up flow uses Clerk's built-in org creation step — no custom creation form. Styled via existing `shadcn` appearance theme.
- D-08: `<SignUp />` configured with `afterSignUpUrl="/dashboard"`. `<OrganizationSwitcher />` configured with `hidePersonal={true}` and `afterCreateOrganizationUrl="/dashboard"`.
- D-09: `/onboarding` is a fallback guard only — standalone page (no sidebar) that renders Clerk's `<CreateOrganization />` component. `afterCreateOrganizationUrl="/dashboard"`. Never the primary sign-up path.
- D-10: The root route `beforeLoad` guard checks `orgId` from the Clerk session — if falsy and user is not on an auth route or `/onboarding`, redirect to `/onboarding`.
- D-11: After accepting a Clerk invitation, the user lands on `/dashboard` with the invited org set as the active org.

**Account Ownership UX**
- D-12: Account creation form: Personal/Shared toggle. Personal = creating user auto-assigned, no member picker. Shared = multi-select member picker shown.
- D-13: "Each person pays their own" flag in an `Advanced` collapsible section, not top-level.
- D-14: Accounts live at `/accounts` as a full page with DataGrid table. Create and edit via a slide-over sheet.
- D-15: Account owners editable post-creation via the same member picker in the edit sheet.
- D-16: Accounts table columns: Name, Type, Institution, Last 4 digits, Owners, Status (active/archived).

**Category, Tag & Merchant Rule UX**
- D-17: Category icon selection uses a searchable Lucide icon picker — a popover with search input and icon grid.
- D-18: Category colour selection uses a preset palette of 10–12 colour swatches. No free-form hex input.
- D-19: Category reordering and merchant rule priority reordering both use drag-and-drop via the **ReUI Sortable component** (not dnd-kit directly).
- D-20: Tag inline creation uses a shadcn Combobox: type to search existing tags, see "Create 'X'" option at bottom if no match.
- D-21: Merchant rule regex validation is client-side on blur. Block form submit if invalid. API also validates server-side.
- D-22: Category/Tags at Settings → Categories & Tags. Merchant Rules at Settings → Merchant Rules. Both dedicated sub-pages.

### Claude's Discretion
- Exact colour values for the category preset palette (choose 10–12 that look good with Tailwind v4 + shadcn theme)
- Lucide icon picker grid layout and pagination (how many icons per page/scroll)
- Sidebar active state styling (highlight, indicator, etc.)
- Exact slide-over sheet layout for account create/edit
- Loading and error states for all CRUD forms

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 2 builds the entire app shell and all prerequisite data structures: households (via Clerk orgs), accounts, categories, tags, and merchant rules. The codebase already has the DB schema for categories/tags/merchant rules and the seed scripts; Phase 2 adds the accounts schema and wires all four CRUD domains through Hono API routes and TanStack Router UI pages.

The primary technical challenge is not individual CRUD operations — those follow a well-established pattern already in the codebase — but rather assembling the full app shell with the org guard, sidebar, Clerk component placement, and the four distinct UI surfaces (accounts page, categories settings, merchant rules settings, household settings) that all share the same shell layout.

The ReUI Sortable component is installed via the shadcn CLI registry (`pnpm dlx shadcn@latest add @reui/sortable`) and drops a component file into the project. It uses dnd-kit under the hood but the project should not import dnd-kit directly. ReUI requires React 19 and Tailwind v4 — both are already present in this project.

**Primary recommendation:** Build in four sequential plans: (1) accounts schema + Hono routes, (2) Clerk org guard + app shell + sidebar, (3) accounts UI, (4) categories/tags/merchant rules UI. The shell must be in place before any page UI is built.

---

## Standard Stack

### Core — already installed

| Library | Version in project | Purpose | Notes |
|---------|--------------------|---------|-------|
| `@clerk/tanstack-react-start` | 1.0.7 | Clerk auth + org components | Verified in apps/web/package.json |
| `@tanstack/react-router` | ^1.132.0 | File-based routing, `beforeLoad` guards | Verified in apps/web/package.json |
| `@tanstack/react-query` | ^5.95.2 | Server state, mutation invalidation | Verified in apps/web/package.json |
| `hono` | ^4.12.9 | API framework | Verified in apps/api/package.json |
| `drizzle-orm` | ^0.45.2 | ORM + query builder | Verified in packages/db/package.json |
| `zod` | ^3.25.76 (via @ploutizo/ui) | Schema validation | Verified in packages/ui/package.json |
| `lucide-react` | ^1.7.0 | Icons (Lucide icon picker uses this) | Verified in apps/web/package.json |
| `radix-ui` | ^1.4.3 | Primitives (Combobox, Collapsible, Sheet, Popover) | Verified in packages/ui/package.json |

### To be added

| Library | Install method | Purpose | Notes |
|---------|---------------|---------|-------|
| ReUI Sortable | `pnpm dlx shadcn@latest add @reui/sortable` | Drag-and-drop reorder | Copies component into project; uses dnd-kit |
| `zod` in `@ploutizo/validators` | already transitive | Zod schemas shared between api and web | Needs explicit dep in validators/package.json |
| `drizzle-zod` | `pnpm add drizzle-zod -w` | Generate Zod schemas from Drizzle tables | Optional but reduces duplication |

**Installation:**
```bash
# In apps/web (or @ploutizo/ui depending on where sortable lives):
pnpm dlx shadcn@latest add @reui/sortable

# Zod in validators package (enables shared schemas between api and web):
pnpm add zod --filter @ploutizo/validators

# drizzle-zod (optional shorthand for insert/select schemas):
pnpm add drizzle-zod --filter @ploutizo/db
```

**Version verification (confirmed 2026-03-31):**
- `@tanstack/react-query`: 5.96.0 latest, project has ^5.95.2 — compatible
- `zod`: 4.3.6 latest (major bump from 3.x — project uses 3.x; do NOT upgrade to v4 without research)
- `drizzle-orm`: 0.45.2 latest, project has ^0.45.2 — current
- `lucide-react`: 1.7.0 latest, project has ^1.7.0 — current

> **Zod v4 warning:** The `zod` package has a v4 on npm (4.3.6). The project uses v3 (^3.25.76). Do NOT upgrade; v4 has breaking API changes. Pin to v3.

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
apps/web/src/
├── routes/
│   ├── __root.tsx              # MODIFY: add org guard to beforeLoad
│   ├── _layout.tsx             # NEW: sidebar shell layout (wraps dashboard, accounts, settings/*)
│   ├── _layout.dashboard.tsx   # NEW: /dashboard placeholder stub
│   ├── _layout.accounts.tsx    # NEW: /accounts DataGrid page
│   ├── _layout.settings/
│   │   ├── route.tsx           # NEW: /settings layout
│   │   ├── categories.tsx      # NEW: /settings/categories
│   │   └── merchant-rules.tsx  # NEW: /settings/merchant-rules
│   ├── onboarding.tsx          # NEW: /onboarding (no sidebar, fallback only)
│   ├── sign-in.$.tsx           # EXISTING — unchanged
│   └── sign-up.$.tsx           # EXISTING — unchanged
├── components/
│   ├── sidebar.tsx             # NEW: sidebar with OrganizationSwitcher, UserButton, nav
│   └── ... (form/sheet/combobox components per page)
└── lib/
    └── queryClient.ts          # EXISTING — unchanged

apps/api/src/
├── routes/
│   ├── health.ts               # EXISTING — unchanged
│   ├── webhooks.ts             # EXISTING — unchanged
│   ├── accounts.ts             # NEW: /api/accounts CRUD
│   ├── categories.ts           # NEW: /api/categories CRUD
│   ├── tags.ts                 # NEW: /api/tags CRUD
│   └── merchantRules.ts        # NEW: /api/merchant-rules CRUD
├── middleware/
│   └── tenantGuard.ts          # EXISTING — unchanged
└── index.ts                    # MODIFY: mount new route modules

packages/db/src/
├── schema/
│   ├── accounts.ts             # NEW: accounts + account_members tables
│   └── index.ts                # MODIFY: add export * from './accounts.js'

packages/validators/src/
└── index.ts                    # POPULATE: Zod schemas for all 4 domains

packages/types/src/
└── index.ts                    # POPULATE: TypeScript interfaces for all 4 domains
```

### Pattern 1: TanStack Router Sidebar Layout with Org Guard

TanStack Router uses `_layout.tsx` (or `_appLayout/route.tsx`) as a layout route. All protected pages live under the layout route and inherit the sidebar. The `__root.tsx` `beforeLoad` adds the org guard on top of the existing auth guard.

**`__root.tsx` org guard addition:**
```typescript
// Source: project convention + D-10 (CONTEXT.md)
// Add orgId check to existing beforeLoad in __root.tsx

const orgGuard = createServerFn().handler(async () => {
  const { orgId } = await auth()  // Clerk server-side auth
  if (!orgId) {
    throw redirect({ to: '/onboarding' })
  }
})

// In createRootRoute beforeLoad:
beforeLoad: async ({ location }) => {
  const isAuthRoute = location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up')
  const isOnboarding = location.pathname === '/onboarding'
  if (!isAuthRoute) {
    await authGuard()
    if (!isOnboarding) {
      await orgGuard()
    }
  }
}
```

**Layout route (`_layout.tsx`) pattern:**
```typescript
// Source: TanStack Router file-based routing convention
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '../components/sidebar.js'

export const Route = createFileRoute('/_layout')({
  component: LayoutShell,
})

function LayoutShell() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

**Sidebar with Clerk components:**
```typescript
// Source: D-02 (CONTEXT.md) + @clerk/tanstack-react-start imports
import { OrganizationSwitcher, UserButton } from '@clerk/tanstack-react-start'

// OrganizationSwitcher config per D-08:
<OrganizationSwitcher
  hidePersonal={true}
  afterCreateOrganizationUrl="/dashboard"
  afterSelectOrganizationUrl="/dashboard"
/>

// UserButton at bottom of sidebar per D-02:
<UserButton />
```

### Pattern 2: Hono CRUD Route

All API routes follow the same shape already established by `health.ts` and `webhooks.ts`. New routes are exported as Hono sub-applications and mounted in `index.ts`.

```typescript
// Source: apps/api/src/routes/health.ts pattern
// Example: apps/api/src/routes/accounts.ts

import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { db } from '@ploutizo/db'
import { accounts, accountMembers } from '@ploutizo/db/schema'
import { eq, and } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { createAccountSchema, updateAccountSchema } from '@ploutizo/validators'

const accountsRouter = new Hono()

accountsRouter.get('/', async (c) => {
  const { orgId } = getAuth(c)
  // tenantGuard already ran — orgId is guaranteed truthy here
  const rows = await db.select().from(accounts).where(eq(accounts.orgId, orgId!))
  return c.json({ data: rows })
})

// ... POST, PATCH, DELETE follow same pattern

export { accountsRouter }
```

**Mount in index.ts:**
```typescript
// After tenant guard line:
import { accountsRouter } from './routes/accounts.js'
app.route('/api/accounts', accountsRouter)
```

### Pattern 3: React Query Mutation with `onSettled` Invalidation

Every mutation follows this shape with `apiFetch` and query invalidation on success and failure (onSettled).

```typescript
// Source: apps/web/src/lib/queryClient.ts + React Query v5 conventions
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient.js'

export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAccountInput) =>
      apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(body) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
```

### Pattern 4: Accounts Schema (new table — to be created)

The `accounts` and `account_members` tables do not yet exist. They must be added to a new file `packages/db/src/schema/accounts.ts` and exported from the schema barrel.

```typescript
// packages/db/src/schema/accounts.ts
import { sql } from 'drizzle-orm'
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { accountTypeEnum } from './enums.js'
import { orgs } from './auth.js'
import { orgMembers } from './auth.js'

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  institution: text('institution'),
  lastFour: text('last_four'),
  /** If true, excluded from settlement balance calculations. */
  eachPersonPaysOwn: boolean('each_person_pays_own').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('accounts_org_idx').on(t.orgId),
])

export const accountMembers = pgTable('account_members', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => orgMembers.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('account_members_account_member_idx').on(t.accountId, t.memberId),
  index('account_members_account_idx').on(t.accountId),
])
```

### Pattern 5: ReUI Sortable Component

ReUI Sortable is installed via shadcn CLI (not as an npm package). It copies a component into the project. The component wraps dnd-kit but exposes a clean 3-export API.

```typescript
// Source: https://reui.io/docs/components/base/sortable
// After running: pnpm dlx shadcn@latest add @reui/sortable

import { Sortable, SortableItem, SortableItemHandle } from '@/components/reui/sortable'

// Usage for category reordering:
<Sortable
  value={categories}
  onValueChange={setCategories}
  getItemValue={(cat) => cat.id}
  layout="vertical"
>
  {categories.map((cat) => (
    <SortableItem key={cat.id} value={cat.id}>
      <SortableItemHandle />
      <span>{cat.name}</span>
    </SortableItem>
  ))}
</Sortable>
```

**ReUI registry setup** — required before `shadcn add @reui/...` works. Add to `components.json`:
```json
{
  "registries": {
    "@reui": "https://reui.io/r/base-nova/{name}.json"
  }
}
```

> **ReUI Tailwind v4 compatibility:** ReUI explicitly requires React 19 and Tailwind v4. Both are present in this project. Confidence: MEDIUM (verified from ReUI docs; no issues reported).

### Pattern 6: Tag Combobox with Inline Create

The Combobox uses shadcn's `<Command>` primitive. The "Create 'X'" item fires a `POST /api/tags` mutation, then immediately adds the new tag to the selection — no page refresh.

```typescript
// Pattern: shadcn Combobox + React Query mutation for inline create
// When search text has no match, render a CommandItem to create:
<CommandItem
  value={`__create__${inputValue}`}
  onSelect={() => createTag.mutate({ name: inputValue })}
>
  Create "{inputValue}"
</CommandItem>
```

The mutation's `onSuccess` callback appends the new tag to the current selection state, making it immediately available.

### Pattern 7: Merchant Rule Regex Validation

Client-side on blur; server-side at save time.

```typescript
// Client-side (on input blur):
const validateRegex = (pattern: string): boolean => {
  try { new RegExp(pattern); return true }
  catch { return false }
}

// Server-side (in Hono route, before insert):
if (body.matchType === 'regex') {
  try { new RegExp(body.pattern) }
  catch { return c.json({ error: { code: 'INVALID_REGEX', message: 'Invalid regex pattern.' } }, 400) }
}
```

### Pattern 8: Zod Validator in Hono Routes

The project already has `@hono/zod-validator` available via hono (check). If not, use manual zod parsing.

```typescript
// Manual zod parse pattern (safe, no extra dep):
const result = createAccountSchema.safeParse(await c.req.json())
if (!result.success) {
  return c.json({ error: { code: 'VALIDATION_ERROR', errors: result.error.issues } }, 400)
}
const body = result.data
```

### Anti-Patterns to Avoid

- **Do not import dnd-kit directly**: Use ReUI Sortable only. Direct dnd-kit imports create version conflicts and bypass the project's chosen abstraction.
- **Do not add Clerk route-level `beforeLoad` separately when the root guard handles it**: The root `beforeLoad` org guard covers all non-auth, non-onboarding routes. No need to add org checks in individual route files.
- **Do not use Drizzle's `.push()` on shared/nullable fields**: All accounts and account_members rows must have non-nullable `org_id` (via cascade reference) — same invariant as all other tables.
- **Do not allow hard delete on categories or tags referenced by transactions**: Phase 2 CRUD must check for references (or implement archive-only; the transaction reference check is handled in Phase 3 with the actual transactions table — for Phase 2, implement archive/unarchive, and defer the hard-delete reference check until Phase 3).
- **Do not use the `$` wildcard sign-in route pattern for new routes**: New routes use the standard TanStack Router file-based naming without the `$` splat pattern.
- **Do not mount new API routes before the tenant guard**: The guard is applied to `/api/*` via `app.use('/api/*', tenantGuard())` in `index.ts`. Adding routes _before_ that line bypasses the guard. Mount all Phase 2 routes _after_ the guard setup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | Custom DragEvent/pointerEvent logic | ReUI Sortable (`@reui/sortable`) | Touch, keyboard, a11y, scroll-container, drop-animation — all handled |
| Tag select-or-create | Custom autocomplete | shadcn Combobox (`<Command>` + `<CommandInput>`) | Keyboard nav, accessibility, already in project's shadcn setup |
| Account list table | Custom `<table>` | shadcn DataTable or ReUI DataGrid | Sorting, pagination, empty states |
| Slide-over form | Custom right-panel div | shadcn `<Sheet side="right">` | Focus trap, close-on-outside-click, backdrop, keyboard escape |
| Member multi-select | Custom dropdown | shadcn `<Command>` multi-select variant | Same keyboard/a11y benefits as combobox |
| Collapsible "Advanced" section | Custom show/hide div | shadcn `<Collapsible>` + `<CollapsibleTrigger>` | Animated, accessible |
| Popover for icon picker | Absolute-positioned div | shadcn `<Popover>` + `<PopoverContent>` | z-index management, portal, click-outside |
| Regex validation | Custom string parsing | `new RegExp(pattern)` inside try/catch | Browser-native, zero deps, exact same engine as Node |

**Key insight:** Every complex UI interaction in this phase has a direct shadcn/ReUI primitive. The work is composing and styling these primitives, not building interaction logic from scratch.

---

## Common Pitfalls

### Pitfall 1: Zod v4 Upgrade
**What goes wrong:** `zod` 4.x is published to npm. Running `pnpm add zod` may install v4 if versions are not pinned. Zod v4 has breaking changes (`.string()` coercion, `.parse()` error shapes).
**Why it happens:** The project uses `"zod": "^3.25.76"` in `@ploutizo/ui` but the `@ploutizo/validators` package stub is empty and has no zod dep yet.
**How to avoid:** When adding zod to `@ploutizo/validators`, pin to `"zod": "^3.25.76"` or `"^3"`. Do not run a bare `pnpm add zod` without a version constraint.
**Warning signs:** Type errors on `.issues` (renamed in v4) or unexpected coercions.

### Pitfall 2: TanStack Router Layout Route Naming
**What goes wrong:** Layout routes in TanStack Router use `_` prefix conventions. A file named `_layout.tsx` creates a pathless layout (no URL segment). A file named `layout.tsx` (without underscore) creates a `/layout` URL segment.
**Why it happens:** Confused with Next.js `layout.tsx` convention which is not pathless.
**How to avoid:** Use `_layout.tsx` for the sidebar shell (pathless). Child routes are `_layout.dashboard.tsx`, `_layout.accounts.tsx`, etc. The generated `routeTree.gen.ts` will confirm the nesting.
**Warning signs:** Navigation goes to `/layout/accounts` instead of `/accounts`.

### Pitfall 3: `orgId` Guard Race in `beforeLoad`
**What goes wrong:** The `auth()` server function in `__root.tsx` is called once. Adding a second `orgGuard` server function that also calls `auth()` works, but if both are called in sequence without caching, it's two round-trips.
**Why it happens:** Each `createServerFn()` is an independent server call.
**How to avoid:** Combine auth + org check into a single server function that does both checks, or accept the two calls (both are fast). Do not merge them into the existing `authGuard` function to preserve the separation of concerns.
**Warning signs:** Slow navigation on first load.

### Pitfall 4: ReUI Registry Not Configured
**What goes wrong:** `pnpm dlx shadcn@latest add @reui/sortable` fails with "registry not found" or installs the wrong component.
**Why it happens:** shadcn CLI needs the ReUI registry URL added to `components.json` before `@reui/*` components can be installed.
**How to avoid:** Add to `components.json` first:
```json
{ "registries": { "@reui": "https://reui.io/r/base-nova/{name}.json" } }
```
**Warning signs:** `Error: Could not resolve registry for @reui/sortable`.

### Pitfall 5: Drizzle `accounts` Table Migration Conflict
**What goes wrong:** The `account_type` enum is already created in migration `0000_many_anthem.sql`. If Phase 2 adds the `accounts` table in a new migration, Drizzle will not re-create the enum but WILL reference it. If schema generation runs before migration, the enum `CREATE TYPE` statement re-appears and fails.
**Why it happens:** `drizzle-kit generate` looks at current schema state vs DB snapshot. The enum is in the snapshot but the `accounts` table is not.
**How to avoid:** Run `db:generate` after adding `accounts.ts` to schema. The generated migration should only contain `CREATE TABLE accounts` and `CREATE TABLE account_members`, not `CREATE TYPE account_type` again. Verify the generated SQL before running `db:migrate`.
**Warning signs:** Migration fails with `type "account_type" already exists`.

### Pitfall 6: Lucide Icon Picker — Importing All Icons
**What goes wrong:** Building the icon picker by importing the entire `lucide-react` icon map (`import * as LucideIcons from 'lucide-react'`) and rendering all 1700+ icons causes a massive bundle size increase.
**Why it happens:** Lucide has 1700+ icons. Tree-shaking only works with named imports.
**How to avoid:** Maintain a curated list of ~50–100 common icons as named imports. Render only those in the picker grid. The icon name string is stored in DB; when displaying, render only the specific named icon via a lookup map.
**Warning signs:** Bundle size increases by 500KB+; picker grid takes >100ms to render.

### Pitfall 7: `settlement_threshold` Column Name Casing
**What goes wrong:** The existing schema uses `settlementThreshold` as the Drizzle column definition key, but the SQL column name is also `settlementThreshold` (not snake_case). This is inconsistent with all other columns (`org_id`, `created_at`, etc.) and may cause issues with raw SQL queries.
**Why it happens:** The column was defined in Phase 1 without the explicit snake_case string. Drizzle infers the SQL name from the JS key.
**How to avoid:** Phase 2 does not modify the `orgs` or `org_members` tables. When reading/writing `settlementThreshold`, use Drizzle ORM (not raw SQL) so the casing is handled automatically.
**Warning signs:** Raw SQL `WHERE settlement_threshold = X` returns no rows.

### Pitfall 8: Account Members `orgId` Constraint
**What goes wrong:** The `account_members` join table does not have a direct `org_id` column — it only references `account_id` (which references `accounts.org_id`). This is correct by design but means queries for "all accounts in org" must join through `accounts`, not filter `account_members.org_id` directly.
**Why it happens:** The many-to-many join table design delegates org scoping to the parent `accounts` table.
**How to avoid:** All `account_members` queries must either join `accounts` or start from the `accounts` query first. The `tenantGuard` ensures `orgId` is always available; use it to filter `accounts.orgId` first, then join `account_members`.
**Warning signs:** `account_members` queries returning cross-org data.

---

## Code Examples

### Hono Route with Zod Validation (no extra dep)
```typescript
// Source: Established project pattern (health.ts + tenantGuard.ts)
// apps/api/src/routes/categories.ts

import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { db } from '@ploutizo/db'
import { categories } from '@ploutizo/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { createCategorySchema } from '@ploutizo/validators'

const categoriesRouter = new Hono()

// GET /api/categories — list active categories for current org
categoriesRouter.get('/', async (c) => {
  const { orgId } = getAuth(c)
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.orgId, orgId!), isNull(categories.archivedAt)))
    .orderBy(categories.sortOrder)
  return c.json({ data: rows })
})

// POST /api/categories
categoriesRouter.post('/', async (c) => {
  const { orgId } = getAuth(c)
  const result = createCategorySchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', errors: result.error.issues } }, 400)
  }
  const [row] = await db.insert(categories).values({ orgId: orgId!, ...result.data }).returning()
  return c.json({ data: row }, 201)
})

export { categoriesRouter }
```

### TanStack Query hook (`useCategories`)
```typescript
// Source: apps/web/src/lib/queryClient.ts apiFetch pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient.js'

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<{ data: Category[] }>('/api/categories').then((r) => r.data),
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCategoryInput) =>
      apiFetch<{ data: Category }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
```

### Priority Reorder Pattern (after drag)
```typescript
// Source: D-19 + ReUI Sortable usage pattern
// When sortable onValueChange fires, PATCH the new sort orders to the API:
const useReorderCategories = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch('/api/categories/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

// API handler: accepts orderedIds array, updates sortOrder for each
// Use a DB transaction to update all rows atomically:
const reorderHandler = async (c: Context) => {
  const { orgId } = getAuth(c)
  const { orderedIds } = await c.req.json()
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(categories)
        .set({ sortOrder: i })
        .where(and(eq(categories.id, orderedIds[i]), eq(categories.orgId, orgId!)))
    }
  })
  return c.json({ data: { ok: true } })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk v5/v6 Core 2 (useOrganization from @clerk/clerk-react) | Current SDK (v7+) — @clerk/tanstack-react-start 1.0.7 | 2024–2025 | `<Show>` component replaces `<Protect>` for conditional rendering |
| dnd-kit used directly | ReUI Sortable (wraps dnd-kit) | Project decision (D-19) | Cleaner API, no direct dnd-kit imports |
| Zod v3 `.parse()` with catch | Zod v3 `.safeParse()` pattern | v3 best practice | Non-throwing, safer in API handlers |
| `@clerk/nextjs` patterns | `@clerk/tanstack-react-start` patterns | Project-specific | Different import paths; `auth()` is the server-side function |

**SDK version note (HIGH confidence):** This project uses `@clerk/tanstack-react-start` v1.0.7, which is the current SDK (not Core 2). The `<Show>` component is available (confirmed in existing `routes/index.tsx`). `useOrganization()` is available from `@clerk/tanstack-react-start` (inherited from React SDK as per Clerk docs).

---

## Open Questions

1. **Hard delete check for categories/tags in Phase 2**
   - What we know: Categories and tags must be archive-only if referenced. The `transactions` table doesn't exist yet in Phase 2.
   - What's unclear: Should the Phase 2 DELETE endpoint block hard-delete entirely (return 405), or allow it with no reference check (and the check is added in Phase 3)?
   - Recommendation: Phase 2 should implement soft-delete (set `archivedAt`) as the only delete endpoint. There is no "hard delete" route. This is safe and correct — if a hard delete is ever needed it's added later.

2. **`components.json` existence and `shadcn` CLI configuration**
   - What we know: The project uses shadcn (it's in `@ploutizo/ui/package.json`). The ReUI Sortable component requires a `components.json` with registry configuration.
   - What's unclear: Whether a `components.json` already exists in `packages/ui/` or `apps/web/`.
   - Recommendation: Check for `components.json` in `packages/ui/` as Wave 0 of the UI plan. If absent, create it using `pnpm dlx shadcn@latest init` in the `packages/ui` directory.

3. **`@hono/zod-validator` availability**
   - What we know: `hono` is installed. `@hono/zod-validator` is a separate package not in `apps/api/package.json`.
   - What's unclear: Whether to add `@hono/zod-validator` or use manual safeParse.
   - Recommendation: Use manual `safeParse` (no new dep, same pattern, already consistent with the test mock patterns in the codebase). Add `@hono/zod-validator` only if the manual approach becomes verbose across many routes.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All build/runtime | Yes | >=22 (project requirement) | — |
| pnpm | Package management | Yes | 9.15.9 (from package.json) | — |
| postgres (Neon) | DB migrations + API runtime | Yes (via existing Phase 1 setup) | — | — |
| shadcn CLI | ReUI Sortable install | Yes (via pnpm dlx) | 4.1.1 in @ploutizo/ui deps | — |
| `components.json` | shadcn CLI component add | UNKNOWN | — | Create via `pnpm dlx shadcn@latest init` |

**Missing dependencies with no fallback:** None blocking execution.

**Missing dependencies with fallback:**
- `components.json`: Needs to exist for `shadcn add @reui/sortable`. Create via shadcn init in Wave 0 of UI plan.
- `zod` in `@ploutizo/validators`: Package is an empty stub. Needs zod added as explicit dep (not just transitive).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `apps/api/vitest.config.ts`, `packages/db/vitest.config.ts` |
| Quick run command | `pnpm test --filter api` |
| Full suite command | `pnpm test` (runs vitest workspace across api, db, validators, types) |
| Test script | `pnpm test` (from root, uses turbo) |

### Phase Requirements → Test Map

| Domain | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| Accounts API | POST /api/accounts creates with correct fields + orgId scope | unit | `pnpm test --filter api` | No — Wave 0 |
| Accounts API | GET /api/accounts returns only current org's accounts | unit | `pnpm test --filter api` | No — Wave 0 |
| Accounts API | `eachPersonPaysOwn` flag persists correctly | unit | `pnpm test --filter api` | No — Wave 0 |
| Categories API | GET /api/categories returns only active (non-archived) categories | unit | `pnpm test --filter api` | No — Wave 0 |
| Categories API | PATCH /api/categories/reorder updates sortOrder in correct order | unit | `pnpm test --filter api` | No — Wave 0 |
| Tags API | POST /api/tags creates and returns new tag | unit | `pnpm test --filter api` | No — Wave 0 |
| Merchant Rules API | POST /api/merchant-rules with invalid regex returns 400 | unit | `pnpm test --filter api` | No — Wave 0 |
| Merchant Rules API | PATCH /api/merchant-rules/reorder updates priority correctly | unit | `pnpm test --filter api` | No — Wave 0 |
| Validators | Zod schemas reject invalid payloads | unit | `pnpm test --filter @ploutizo/validators` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test --filter api`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/accounts.test.ts` — covers accounts CRUD + orgId scoping
- [ ] `apps/api/src/__tests__/categories.test.ts` — covers categories CRUD + archive + reorder
- [ ] `apps/api/src/__tests__/tags.test.ts` — covers tag create + archive
- [ ] `apps/api/src/__tests__/merchantRules.test.ts` — covers CRUD + regex validation + reorder
- [ ] `packages/validators/src/__tests__/index.test.ts` — covers Zod schema validation

Existing test infrastructure (tenantGuard.test.ts, seeds.test.ts, client.test.ts, health.test.ts) covers Phase 1 functionality and requires no changes.

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` file exists at the project root (`/Users/tarnesty/Developer/personal/ploutizo/CLAUDE.md` returned file-not-found). The global `~/.claude/CLAUDE.md` contains one directive:

- **Testing:** Never invoke test runners directly (e.g. `npx vitest`). Always use the project's test script (`pnpm test`) so configured flags and runner are respected.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `packages/db/src/schema/*.ts`, `apps/api/src/**`, `apps/web/src/**`, `package.json` files — all Phase 1 code verified
- `packages/db/drizzle/0000_many_anthem.sql` — confirmed migration state, enum existence
- Phase 2 CONTEXT.md — locked decisions D-01 through D-22

### Secondary (MEDIUM confidence)
- https://reui.io/docs/components/base/sortable — Sortable component API (props, install command verified)
- https://reui.io/docs/get-started — ReUI requires React 19 + Tailwind v4 (both present)
- Clerk SDK skills (`.claude/skills/clerk-orgs/SKILL.md`) — OrganizationSwitcher props, `useOrganization` hook
- npm registry: `zod@4.3.6`, `drizzle-orm@0.45.2`, `@tanstack/react-query@5.96.0`, `lucide-react@1.7.0` — version checks run 2026-03-31

### Tertiary (LOW confidence)
- ReUI dependency on dnd-kit: confirmed from documentation description and shadcn registry pattern, but full source not inspected — treat as MEDIUM

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json files, versions checked against npm registry
- Architecture patterns: HIGH — based on existing project code (not speculation), Hono/TanStack Router/Drizzle patterns read directly
- Pitfalls: HIGH — all 8 pitfalls derived from inspecting actual project code or official constraint documents
- ReUI Sortable integration: MEDIUM — install command and API verified, dnd-kit dep inferred

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable stack — main risk is zod v4 and Clerk SDK updates)
