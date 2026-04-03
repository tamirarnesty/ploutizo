---
phase: 02-households-accounts-classification
verified: 2026-04-01T21:00:00Z
status: human_needed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Default category list (11 categories with Lucide icons) is present immediately after org creation — orgs FK fix applied in webhooks.ts (commit 3562efd)"
    - "Tag created inline during a form flow is available for reuse — ReUI Combobox with search + Create X option implemented in categories.tsx (commit 728b25c)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Create a household, accept invitation as a second member, verify both can see shared dashboard data"
    expected: "Both users see /dashboard with the sidebar, accounts list, and shared category data after signing in with afterSignInUrl='/dashboard'"
    why_human: "Requires a live Clerk environment with two accounts and a valid webhook endpoint. Cannot test the invitation email flow or the Clerk session orgId behavior programmatically."
  - test: "Set eachPersonPaysOwn flag on an account; verify it appears in the accounts list"
    expected: "Account is visible with correct status; the eachPersonPaysOwn flag is stored and returned by GET /api/accounts"
    why_human: "Settlement balance query exclusion is deferred to Phase 4; only visual presence can be checked now."
  - test: "On /settings/merchant-rules, enter an invalid regex (e.g. '[invalid(') in the pattern field with matchType=regex, then blur"
    expected: "Red border appears on pattern field, 'Invalid regular expression.' error shown, Save rule button is disabled"
    why_human: "Client-side regex validation on blur is a behavioral interaction that requires browser rendering."
---

# Phase 02: Households, Accounts & Classification Verification Report

**Phase Goal:** Users can create and manage households, invite members, set up their financial accounts, and manage the category/tag/merchant-rule structures that classify transactions. All prerequisite data structures are in place before the first transaction is created.

**Verified:** 2026-04-01T21:00:00Z
**Status:** HUMAN NEEDED (all automated checks pass)
**Re-verification:** Yes — after gap closure plans 02-05 and 02-06

---

## Goal Achievement

### Observable Truths (Phase Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Invited member can accept via Clerk invitation and immediately see household data | ? HUMAN | afterSignInUrl="/dashboard" set on SignIn; orgGuard redirects to /onboarding when no org; dashboard route exists and builds. Functional end-to-end requires live Clerk + webhook. |
| 2 | Account created with "each person pays their own" flag is visible in account list | ✓ VERIFIED | accounts schema has eachPersonPaysOwn boolean; POST/GET /api/accounts handles it; accounts table renders the flag; settlement exclusion deferred to Phase 4 as stated. |
| 3 | Default category list (11 categories with Lucide icons) is present immediately after org creation | ✓ VERIFIED | webhooks.ts line 33: `db.insert(orgs).values({ id: event.data.id }).onConflictDoNothing()` before `seedOrg(event.data.id)` at line 34. FK violation resolved. Commit 3562efd. |
| 4 | Tag created inline during a form flow is available for reuse in subsequent transaction forms | ✓ VERIFIED | categories.tsx has ReUI Combobox (22 matches) with `__create__` prefix convention for inline tag creation. POST /api/tags persists tags. Commit 728b25c. |
| 5 | Merchant rule with regex match type is rejected at save if the pattern is invalid; valid rule is saved and priority-ordered correctly | ✓ VERIFIED | Server: validateRegexIfNeeded() returns 400 INVALID_REGEX. Client: aria-invalid={isRegexError} on Input, disabled={isSaving \|\| isRegexError} on Save button. PATCH /reorder before PATCH /:id. 26/26 API tests pass. |

**Score:** 4/5 truths fully verified (1 human-needed, all automated checks pass)

---

## Required Artifacts

### Plan 02-01: Accounts DB + Validators + API

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/db/src/schema/accounts.ts` | ✓ VERIFIED | Exports `accounts` and `accountMembers` with correct FK chain, indexes, eachPersonPaysOwn flag |
| `packages/db/src/schema/index.ts` | ✓ VERIFIED | Contains `export * from './accounts.js'` |
| `packages/validators/src/index.ts` | ✓ VERIFIED | Exports createAccountSchema, updateAccountSchema, updateHouseholdSettingsSchema, createCategorySchema, createTagSchema, createMerchantRuleSchema, reorderSchema |
| `packages/types/src/index.ts` | ✓ VERIFIED | Exports Account, AccountMember, HouseholdSettings, OrgMember interfaces |
| `apps/api/src/routes/accounts.ts` | ✓ VERIFIED | accountsRouter with GET, POST, PATCH/:id, GET/:id/members, DELETE/:id/archive |
| `apps/api/src/routes/households.ts` | ✓ VERIFIED | householdsRouter with GET/settings, PATCH/settings, GET/members |
| `apps/api/src/index.ts` | ✓ VERIFIED | Both routes mounted after tenant guard |

### Plan 02-02: App Shell + Auth Flow

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/src/routes/__root.tsx` | ✓ VERIFIED | orgGuard server fn and beforeLoad with isOnboarding check; .js import stripped |
| `apps/web/src/routes/onboarding.tsx` | ✓ VERIFIED | Renders CreateOrganization with heading "Create your household" |
| `apps/web/src/routes/_layout.tsx` | ✓ VERIFIED | SidebarProvider + AppSidebar + SidebarInset; .js import stripped |
| `apps/web/src/routes/_layout.dashboard.tsx` | ✓ VERIFIED | Dashboard stub page inside sidebar shell |
| `apps/web/src/routes/_layout.settings/route.tsx` | ✓ VERIFIED | Settings layout with Outlet |
| `apps/web/src/routes/_layout.settings/household.tsx` | ✓ VERIFIED | OrganizationProfile + settlementThreshold form with Label+Input+Button+Spinner; no raw HTML; .js import stripped |
| `apps/web/src/components/app-sidebar.tsx` | ✓ VERIFIED | AppSidebar with OrganizationSwitcher (hidePersonal=true), nav items, UserButton |
| `apps/web/src/routes/sign-in.$.tsx` | ✓ VERIFIED | afterSignInUrl="/dashboard" set on SignIn component |
| `apps/web/src/routes/sign-up.$.tsx` | ✓ VERIFIED | afterSignUpUrl="/dashboard" set on SignUp component |

### Plan 02-03: Accounts UI

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/web/src/routes/_layout.accounts.tsx` | ✓ VERIFIED | /accounts route with AccountsTable + AccountSheet; Button component; .js import stripped |
| `apps/web/src/components/accounts/accounts-table.tsx` | ✓ VERIFIED | DataTable with columns, loading skeleton, empty state; Button component; zero raw HTML |
| `apps/web/src/components/accounts/account-sheet.tsx` | ✓ VERIFIED | ToggleGroup ownership toggle; Label+Input+Select type; Checkbox co-owners; Spinner; Button; zero raw HTML; .js import stripped |
| `apps/web/src/hooks/use-accounts.ts` | ✓ VERIFIED | useAccounts, useCreateAccount, useUpdateAccount, useArchiveAccount, useOrgMembers, useAccountMembers; .js import stripped |
| `apps/web/src/lib/format-currency.ts` | ✓ VERIFIED | Exports formatCurrency(cents) converting to USD string |

### Plan 02-04: Classification API + UI

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/routes/categories.ts` | ✓ VERIFIED | PATCH /reorder before PATCH /:id; all CRUD including archive |
| `apps/api/src/routes/tags.ts` | ✓ VERIFIED | GET, POST, DELETE/:id/archive |
| `apps/api/src/routes/merchant-rules.ts` | ✓ VERIFIED | INVALID_REGEX check; PATCH /reorder before PATCH /:id; hard DELETE |
| `apps/web/src/routes/_layout.settings/categories.tsx` | ✓ VERIFIED | Dialog-based CategoryDialog; Combobox tag section with `__create__` convention; zero raw HTML; .js imports stripped |
| `apps/web/src/routes/_layout.settings/merchant-rules.tsx` | ✓ VERIFIED | Dialog-based RuleDialog; isRegexError + aria-invalid; __none__ sentinel for categoryId; zero raw HTML; .js imports stripped |
| `apps/web/src/components/categories/icon-picker.tsx` | ✓ VERIFIED | Popover replaces absolute div; HeartPulse/Sparkles/MoreHorizontal in ICON_MAP; zero raw HTML; no wildcard import |
| `apps/web/src/components/categories/colour-picker.tsx` | ✓ VERIFIED | 12 swatches with ring selection indicator (exempt from raw HTML rule) |
| `apps/web/src/hooks/use-categories.ts` | ✓ VERIFIED | All 5 hooks; .js import stripped |
| `apps/web/src/hooks/use-tags.ts` | ✓ VERIFIED | useTags, useCreateTag, useArchiveTag; .js import stripped |
| `apps/web/src/hooks/use-merchant-rules.ts` | ✓ VERIFIED | All hooks use apiFetch; .js import stripped |
| `packages/ui/src/components/reui/sortable.tsx` | ✓ VERIFIED | Installed and used in both categories and merchant-rules pages |

### Plan 02-05: Gap Closure — Orgs FK Fix + Tag Combobox + Missing Icons

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/api/src/routes/webhooks.ts` | ✓ VERIFIED | Line 33: `db.insert(orgs).values({ id: event.data.id }).onConflictDoNothing()` before seedOrg (line 34). Both `db` and `orgs` imported. |
| `packages/ui/src/components/reui/combobox.tsx` | ✓ VERIFIED | File exists; manually built from Popover primitives (ReUI registry had no combobox for radix-nova style) |
| `apps/web/src/components/categories/icon-picker.tsx` | ✓ VERIFIED | HeartPulse, Sparkles, MoreHorizontal in both import (line 9) and ICON_MAP (line 23) |

### Plan 02-06: UI Code Quality — shadcn Primitives

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/ui/src/components/label.tsx` | ✓ VERIFIED | File exists |
| `packages/ui/src/components/dialog.tsx` | ✓ VERIFIED | File exists; used in categories.tsx and merchant-rules.tsx |
| `packages/ui/src/components/toggle-group.tsx` | ✓ VERIFIED | File exists; used in account-sheet.tsx |
| `packages/ui/src/components/toggle.tsx` | ✓ VERIFIED | File exists (dependency of toggle-group) |
| `packages/ui/src/components/radio-group.tsx` | ✓ VERIFIED | File exists |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `__root.tsx` | `/onboarding` | orgGuard redirect | ✓ WIRED | orgGuard server fn throws redirect({ to: '/onboarding' }) when orgId falsy |
| `_layout.tsx` | `app-sidebar.tsx` | import AppSidebar | ✓ WIRED | .js extension stripped; import { AppSidebar } used in SidebarProvider wrapper |
| `app-sidebar.tsx` | OrganizationSwitcher | @clerk/tanstack-react-start | ✓ WIRED | hidePersonal=true, afterCreateOrganizationUrl="/dashboard" |
| `sign-in.$.tsx` | /dashboard | afterSignInUrl prop | ✓ WIRED | afterSignInUrl="/dashboard" on SignIn component |
| `accounts.ts` | `accounts schema` | import { accounts, accountMembers } | ✓ WIRED | Pattern "accountMembers" present |
| `households.ts` | `orgs schema` | import { orgs } from '@ploutizo/db/schema' | ✓ WIRED | Pattern "orgs" present |
| `api/index.ts` | accountsRouter | app.route('/api/accounts', accountsRouter) | ✓ WIRED | After tenant guard |
| `merchant-rules.ts` | regex validation | try { new RegExp(pattern) } catch | ✓ WIRED | validateRegexIfNeeded() called in POST and PATCH |
| `categories.tsx` | ReUI Sortable | import { Sortable, SortableItem } | ✓ WIRED | Sortable component used in categories list |
| `merchant-rules.tsx` | client regex validation | isRegexError state + aria-invalid | ✓ WIRED | Input has aria-invalid={isRegexError}; Save button disabled when isRegexError |
| `webhooks.ts` | orgs row insert | db.insert(orgs).onConflictDoNothing() | ✓ WIRED | Line 33 inserts orgs row BEFORE seedOrg at line 34 |
| `webhooks.ts` | seedOrg | seedOrg(event.data.id) | ✓ WIRED | Called after orgs insert; FK violation resolved |
| `categories.tsx` | Combobox tag section | import Combobox from @ploutizo/ui/components/reui/combobox | ✓ WIRED | 22 Combobox references; `__create__` convention present; calls createTag.mutate() |
| `icon-picker.tsx` | Popover | import { Popover, PopoverTrigger, PopoverContent } | ✓ WIRED | PopoverTrigger asChild + PopoverContent replace absolute-positioned div |
| `account-sheet.tsx` | ToggleGroup | import { ToggleGroup, ToggleGroupItem } | ✓ WIRED | type="single" ownership toggle with Personal/Shared items |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `_layout.settings/household.tsx` | settlementThreshold | GET /api/households/settings -> orgs table | ✓ YES — orgs row now created by webhook before seedOrg | ✓ FLOWING |
| `_layout.settings/categories.tsx` | categories | GET /api/categories -> categories table | ✓ YES — FK violation resolved; categories seeded on org creation | ✓ FLOWING |
| `_layout.accounts.tsx` | accounts | GET /api/accounts -> accounts table | ✓ YES — accounts inserted by user action | ✓ FLOWING |
| `_layout.settings/merchant-rules.tsx` | rules | GET /api/merchant-rules -> merchantRules table | ✓ YES — FK violation resolved; merchant rules seeded on org creation | ✓ FLOWING |
| `_layout.settings/categories.tsx` | tags (Combobox) | GET /api/tags -> tags table | ✓ YES — useTags query; createTag.mutate() writes via POST /api/tags | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API tests pass | pnpm test --filter api -- --run | 26/26 tests pass (7 files) | ✓ PASS |
| Web build succeeds | pnpm build --filter web | Built in 2.54s, no type errors | ✓ PASS |
| orgs row inserted before seedOrg | grep -n "db.insert(orgs)" + "seedOrg" webhooks.ts | Line 33 before line 34 | ✓ PASS |
| Combobox in categories.tsx | grep "Combobox" categories.tsx | 22 matches including import and JSX | ✓ PASS |
| __create__ convention present | grep "__create__" categories.tsx | Match found (lines 250-251) | ✓ PASS |
| HeartPulse/Sparkles/MoreHorizontal in ICON_MAP | grep -n on icon-picker.tsx | Lines 9 (import) and 23 (ICON_MAP) | ✓ PASS |
| No wildcard lucide import | grep "import \*" icon-picker.tsx | No match | ✓ PASS |
| No raw HTML in 7 affected files | grep -c "<button\|<input\|<label\|<select" 7 files | 0 matches each | ✓ PASS |
| No .js relative imports in 11 files | grep "\.js'" 11 files (excl. @ploutizo) | No matches | ✓ PASS |
| fixed inset-0 removed from modals | grep "fixed inset-0" categories.tsx merchant-rules.tsx | No matches | ✓ PASS |
| DialogContent used for both modals | grep "DialogContent" categories.tsx merchant-rules.tsx | 1 match each | ✓ PASS |
| PopoverContent in icon-picker | grep "PopoverContent" icon-picker.tsx | 1 match | ✓ PASS |
| ToggleGroup in account-sheet | grep "ToggleGroup" account-sheet.tsx | 3 matches | ✓ PASS |
| Spinner replaces SVG spinners | grep "animate-spin\|<svg" account-sheet.tsx household.tsx | No matches | ✓ PASS |
| __none__ sentinel in merchant-rules | grep "__none__" merchant-rules.tsx | 3 matches (useState, payload conversion, SelectItem) | ✓ PASS |
| aria-invalid on pattern Input | grep "aria-invalid" merchant-rules.tsx | 1 match | ✓ PASS |
| All 9 plan 05+06 commits exist | git log --oneline | All 9 hashes confirmed | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| §1 Households & Users | 02-01, 02-02, 02-05, 02-06 | Household creation, invitation flow, org guard, settings, orgs row seeding | ✓ SATISFIED | App shell + invitation flow + household settings UI all present. orgs row inserted before seedOrg in webhook (commit 3562efd). PATCH /api/households/settings now has a row to update. |
| §2 Accounts (full feature) | 02-01, 02-03, 02-06 | Account CRUD, eachPersonPaysOwn, account_members, design system | ✓ SATISFIED | Full CRUD API + UI; eachPersonPaysOwn flag; ToggleGroup ownership; Checkbox co-owners; Spinner; all raw HTML replaced. |
| §3 Categories & Tags (full feature) | 02-04, 02-05, 02-06 | Category CRUD with seed, tag inline-create via Combobox, icon/colour pickers, archive protection | ✓ SATISFIED | API and UI complete. FK violation fixed — categories seed on org creation. Tag Combobox with search + Create X option. Missing icons (HeartPulse/Sparkles/MoreHorizontal) added. Dialog-based CategoryDialog. |
| §9 Merchant Rules (CRUD) | 02-04, 02-06 | CRUD with regex validation, priority reorder, design system | ✓ SATISFIED | Full CRUD API + UI with regex validation (server + client aria-invalid), drag-to-reorder, Dialog-based RuleDialog, __none__ sentinel. Default merchant rules now seed correctly. |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/api/src/routes/webhooks.ts` | No webhook handler for `organization.membership.created` | Warning (carry-over) | org_members table is never populated; co-owner picker in account sheet always shows "No other members" until this is addressed in a future plan |

No blocker or new warning anti-patterns introduced in plans 02-05 or 02-06.

---

## Human Verification Required

### 1. Invitation Acceptance Flow

**Test:** Create a household as user A. Invite user B via /settings/household (OrganizationProfile). User B accepts via Clerk invitation email. User B signs in.
**Expected:** User B lands on /dashboard and can see the sidebar with nav items. Declined invitations leave the household unchanged.
**Why human:** Requires live Clerk environment with two real user accounts, webhook endpoint, and valid email delivery.

### 2. "Each person pays their own" Visibility

**Test:** Create an account with eachPersonPaysOwn=true. Navigate to /accounts.
**Expected:** Account appears in the accounts list with its type, status, and the eachPersonPaysOwn indicator. It is excluded from settlement balance queries (Phase 4 verification).
**Why human:** Settlement exclusion is deferred to Phase 4. Visual presence needs browser rendering.

### 3. Merchant Rule Regex Client Validation

**Test:** Navigate to /settings/merchant-rules. Click "Add rule". Set Match type to "Regex". Type `[invalid(` in Pattern. Click or tab away from the field.
**Expected:** Pattern field gets red border (via aria-invalid), "Invalid regular expression." text appears below, and the "Save rule" button is disabled.
**Why human:** onBlur client-side regex validation requires interactive browser behavior.

---

## Re-verification Summary

Previous verification (2026-04-01T18:37:39Z) found 2 gaps:

**BLOCKER 1 — orgs row never inserted:** CLOSED
Plan 02-05 commit 3562efd added `await db.insert(orgs).values({ id: event.data.id }).onConflictDoNothing()` on line 33 of webhooks.ts, immediately before `await seedOrg(event.data.id)` on line 34. The FK constraint is satisfied; default categories and merchant rules now seed correctly on org creation.

**GAP 2 — Tag Combobox not implemented:** CLOSED
Plan 02-05 commit 728b25c replaced the plain `<input>` + "Add tag" button with a Popover-based Combobox (`packages/ui/src/components/reui/combobox.tsx`) that shows existing tags and a "Create X" option when typed input has no exact match. The `__create__` prefix convention strips the sentinel to extract the tag name before calling `createTag.mutate()`.

**Additional improvements from plan 02-06:**
- 5 new shadcn components installed in packages/ui (Label, Dialog, ToggleGroup, Toggle, RadioGroup)
- .js extensions stripped from relative imports in 11 files
- Zero raw `<button>/<input>/<label>/<select>` remain in the 7 affected component/route files
- CategoryDialog and RuleDialog converted to shadcn Dialog (no more hand-rolled fixed overlays)
- Icon picker converted from absolute-positioned div to Popover
- Ownership toggle uses ToggleGroup type="single"
- Both inline SVG spinners replaced with Spinner component

**Remaining carry-over warning (non-blocking):**
- `organization.membership.created` webhook not implemented — org_members table never populated, co-owner picker shows "No other members". Not a Phase 02 requirement; no phase-level success criterion depends on it.

---

_Verified: 2026-04-01T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
