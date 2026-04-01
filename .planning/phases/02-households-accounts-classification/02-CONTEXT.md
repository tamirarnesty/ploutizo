# Phase 2: Households, Accounts & Classification - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

All prerequisite data structures users configure before creating transactions:
- Household creation flow and onboarding (first-use experience)
- Member invitation management via Clerk's `<OrganizationProfile />`
- Financial account CRUD (all 7 types, personal/shared ownership)
- Category CRUD with icon/colour (default seed list from Phase 1 visible)
- Tag CRUD with select-or-create-inline flow
- Merchant rule CRUD with priority reordering and regex validation
- Full app shell (sidebar layout, navigation structure) that all future phases build on

Transaction creation, settlement, and import are out of scope — those reference Phase 2 data structures.

</domain>

<decisions>
## Implementation Decisions

### App Shell & Sidebar
- **D-01:** Sidebar uses feature sections: Dashboard, Transactions, Accounts, Settlement, Budgets, Import, Settings. Settings nests: Categories & Tags, Merchant Rules, Household.
- **D-02:** `<OrganizationSwitcher />` pinned at the top of the sidebar. `<UserButton />` pinned to the bottom. No header bar.
- **D-03:** Default landing route after authentication is `/dashboard`. Phase 2 renders a placeholder stub; full dashboard built in Phase 4+.
- **D-04:** Show only live nav sections — no disabled/coming-soon items for future phases. Items added to the sidebar as phases ship.
- **D-05:** Sidebar is fixed-width, no collapse on desktop.
- **D-06:** On mobile: sidebar hides off-screen; hamburger button opens it as a drawer overlay.

### First-Use / No-Org Flow
- **D-07:** A signed-in user with no active org is redirected to `/onboarding`. The `beforeLoad` hook in the root route checks `orgId` from the Clerk session — if falsy, redirect to `/onboarding`.
- **D-08:** `/onboarding` is standalone — no sidebar, no app shell. Just the household creation form: display name input → `organizations.createOrganization()` call → redirect to `/dashboard` on success.
- **D-09:** After accepting a Clerk invitation, the user lands on `/dashboard` with the invited org set as the active org.

### Account Ownership UX
- **D-10:** Account creation form has a Personal / Shared ownership toggle at the top. Personal: creating user auto-assigned as sole owner, no member picker shown. Shared: multi-select member picker reveals for co-owner selection.
- **D-11:** "Each person pays their own" flag lives in an `Advanced` collapsible section within the account form — not shown at top level.
- **D-12:** Accounts live at `/accounts` as a full page with a DataGrid table. Create and edit via a slide-over sheet.
- **D-13:** Account owners are editable post-creation via the same member picker in the edit sheet.
- **D-14:** Accounts table columns: Name, Type, Institution, Last 4 digits, Owners, Status (active/archived).

### Category, Tag & Merchant Rule UX
- **D-15:** Category icon selection uses a searchable Lucide icon picker — a popover with a search input and icon grid. User types (e.g. "cart") to find matching icons, clicks to select. Stores the Lucide icon name string.
- **D-16:** Category colour selection uses a preset palette of 10–12 colour swatches. No free-form hex input. Swatches chosen to match the brand palette.
- **D-17:** Category reordering and merchant rule priority reordering both use drag-and-drop via the **ReUI Sortable component** (not dnd-kit directly). See canonical ref.
- **D-18:** Tag inline creation uses a shadcn Combobox: type to search existing tags, see "Create 'X'" option at the bottom if no match. Single component handles select and create.
- **D-19:** Merchant rule regex validation is client-side on blur: when the pattern field loses focus, validate the regex locally and show an inline "Invalid regex pattern" error. Block form submit if invalid. API also validates server-side.
- **D-20:** Category/Tags management lives at Settings → Categories & Tags. Merchant Rules management lives at Settings → Merchant Rules. Both are dedicated sub-pages, not inline within other flows.

### Claude's Discretion
- Exact colour values for the category preset palette (choose 10–12 that look good with Tailwind v4 + shadcn theme)
- Lucide icon picker grid layout and pagination (how many icons per page/scroll)
- Sidebar active state styling (highlight, indicator, etc.)
- Exact slide-over sheet layout for account create/edit
- Loading and error states for all CRUD forms

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project conventions
- `CLAUDE.md` — Package import boundaries, stack choices, multi-tenancy rules, API conventions, coding style, testing rules

### Requirements & planning
- `.planning/REQUIREMENTS.md` §1 — Households & Users: Clerk invitation lifecycle, org creation, member join, `birth_year` privacy, `<OrganizationProfile />` for invitations
- `.planning/REQUIREMENTS.md` §2 — Accounts: all 7 account types, personal/shared ownership, `account_members` join table, "each person pays their own" flag, active/archived
- `.planning/REQUIREMENTS.md` §3 — Categories & Tags: default seed list (11 categories), Lucide icon field, colour, sort order, archive-only delete, tag select-or-create-inline
- `.planning/REQUIREMENTS.md` §9 — Merchant Rules: CRUD, all 5 match types, priority order, regex validation at save, seed rules visible after org creation
- `.planning/ROADMAP.md` §Phase 2 — Exact deliverables, 4-plan breakdown, success criteria

### Existing schema (read before writing new schema files)
- `packages/db/src/schema/auth.ts` — `orgs`, `orgMembers`, `users` tables (already exist; accounts will reference `orgMembers` for ownership)
- `packages/db/src/schema/classification.ts` — `categories`, `tags`, `merchantRules`, `merchantRuleTags` tables (already exist; read before adding accounts schema to same module)
- `packages/db/src/schema/enums.ts` — `accountTypeEnum` (already defined), `merchantMatchTypeEnum` — reuse, do not redefine

### UI component library
- ReUI Sortable (drag-and-drop): https://reui.io/docs/components/base/sortable — use for category reorder and merchant rule priority reorder

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/middleware/tenantGuard.ts` — Already wired. Phase 2 API routes at `/api/*` are automatically protected.
- `apps/api/src/routes/webhooks.ts` — `organization.created` → `seedOrg(orgId)` already handled. Phase 2 does not need to modify this.
- `apps/web/src/lib/queryClient.ts` — `apiFetch<T>(path, options)` helper with Clerk bearer token injection. All Phase 2 React Query hooks use this.
- `packages/db/src/schema/classification.ts` — Categories, tags, merchant rules tables already defined. Phase 2 adds the `accounts` and `account_members` tables to a new `accounts.ts` schema file.
- `packages/db/src/schema/enums.ts` — `accountTypeEnum` already defined: `chequing | savings | credit_card | prepaid_cash | e_transfer | investment | other`. Import from here, do not redefine.
- `packages/validators/src/index.ts` — Empty stub, ready for Phase 2 Zod schemas.
- `packages/types/src/index.ts` — Empty stub, ready for Phase 2 TypeScript types.

### Established Patterns
- Middleware order: `cors()` → `clerkMiddleware()` → `tenantGuard()` — invariant from Phase 1, do not change.
- `getAuth(c).orgId` is `undefined` (not `null`) when no active org — falsy check `!orgId` in all API handlers.
- All DB tables use non-nullable `org_id` — no nullable org rows. Phase 2 adds `accounts` with the same constraint.
- Schema barrel at `packages/db/src/schema/index.ts` — add `export * from './accounts.js'` when creating the accounts schema.
- Seed scripts pattern: `seedOrg(orgId)` already calls `seedOrgCategories` and `seedOrgMerchantRules`. No Phase 2 changes needed to seeds — they run at org creation via the existing webhook.

### Integration Points
- App shell routes: `apps/web/src/routes/__root.tsx` — add org guard (`beforeLoad` redirect to `/onboarding` if no `orgId`). Currently only has auth guard.
- New route files needed: `apps/web/src/routes/onboarding.tsx`, `apps/web/src/routes/dashboard.tsx`, `apps/web/src/routes/accounts.tsx`, `apps/web/src/routes/settings/categories.tsx`, `apps/web/src/routes/settings/merchant-rules.tsx`
- TanStack Router will auto-generate `routeTree.gen.ts` — run `pnpm dev` or the route generator after adding new route files.

</code_context>

<specifics>
## Specific Ideas

- Drag-and-drop reordering: use **ReUI Sortable** (not bare dnd-kit). User specifically called this out — check docs at https://reui.io/docs/components/base/sortable before planning.
- Tag combobox "Create X" pattern: the Combobox shows a "Create 'typed text'" option when no existing tag matches. Creating inline must POST to `POST /api/tags` and immediately make the new tag available for selection in the same form session without a page refresh.
- Onboarding page: welcome message → household name input → Create button. No org name validation beyond what Clerk enforces. After `organizations.createOrganization()` succeeds, Clerk fires the `organization.created` webhook which seeds the org. The UI redirect to `/dashboard` can happen immediately; seed script runs async in the background.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-households-accounts-classification*
*Context gathered: 2026-03-31*
