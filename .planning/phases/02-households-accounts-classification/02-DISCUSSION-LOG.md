# Phase 2: Households, Accounts & Classification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-households-accounts-classification
**Areas discussed:** App shell & sidebar, First-use / no-org flow, Account ownership UX, Category icon & colour UX

---

## App Shell & Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Feature sections | Dashboard, Transactions, Accounts, Settlement, Budgets, Import, Settings (nested) | ✓ |
| Money-flow sections | Dashboard, Money In/Out, Accounts, Planning, Import, Settings | |
| Flat nav links | All items at same level, categories/tags as direct links | |

**User's choice:** Feature sections
**Notes:** Settings nests Categories & Tags, Merchant Rules, Household sub-pages.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar top + bottom | OrganizationSwitcher at top, UserButton at bottom | ✓ |
| Top header bar | Full-width header with switcher left, user menu right | |

**User's choice:** Sidebar top + bottom

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard (default landing) | / routes to dashboard stub in Phase 2 | ✓ |
| Transactions list | /transactions as home | |
| Accounts page | /accounts as first landing | |

**User's choice:** Dashboard

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show live sections only | No disabled/coming-soon items | ✓ |
| Show all with disabled state | Full nav visible with locked items for future phases | |
| You decide | Claude picks | |

**User's choice:** Show live sections only

---

| Option | Description | Selected |
|--------|-------------|----------|
| No, fixed width | No collapse state | ✓ |
| Yes, collapsible | Icon-only collapsed state | |

**User's choice:** Fixed width, no collapse

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar hides, hamburger menu | Drawer overlay on mobile | ✓ |
| Bottom tab bar on mobile | Replace sidebar with bottom tabs | |
| Desktop-only for v1 | No mobile responsiveness | |

**User's choice:** Hamburger drawer on mobile

---

## First-Use / No-Org Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /onboarding page | Standalone creation page, no sidebar | ✓ |
| OrganizationSwitcher inline | Rely on Clerk's built-in modal | |
| Dashboard with empty state | Show empty state CTA on dashboard | |

**User's choice:** Dedicated /onboarding page (standalone, no sidebar)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard of accepted household | Redirect to /dashboard with invited org active | ✓ |
| Accounts page of accepted household | Land on /accounts | |
| You decide | Claude picks | |

**User's choice:** /dashboard of the accepted household

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /onboarding | beforeLoad checks orgId, redirects if falsy | ✓ |
| Show modal over current page | Creation modal rendered globally | |

**User's choice:** Redirect to /onboarding

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone, no sidebar | /onboarding outside app shell | ✓ |
| Shell visible but disabled | App shell renders with disabled sidebar | |
| You decide | Claude picks | |

**User's choice:** Standalone, no sidebar

---

## Account Ownership UX

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle: Personal / Shared | Toggle at top; Personal = auto-assigns creator; Shared = shows member picker | ✓ |
| Always show member picker | Picker always visible | |
| Member picker, self pre-checked | Self pre-checked, uncheck to share | |

**User's choice:** Toggle: Personal / Shared
**Notes:** Personal auto-assigns creating user. Shared reveals multi-select member picker.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox in Advanced section | Collapsed under Advanced disclosure | ✓ |
| Visible checkbox always | Always shown in form | |
| You decide | Claude picks | |

**User's choice:** "Each person pays their own" in Advanced collapsible section

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full page /accounts | DataGrid table; create/edit via slide-over sheet | ✓ |
| Full page + detail page | Separate /accounts/:id page | |
| You decide | Claude picks | |

**User's choice:** Full page /accounts with slide-over sheet

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, editable post-creation | Edit sheet includes member picker | ✓ |
| Owners locked after creation | Ownership set at creation only | |

**User's choice:** Yes, owners editable post-creation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Name, type, institution, last 4, owners, status | All key fields in table | ✓ |
| Name, type, owners, status only | Slimmer table | |
| You decide | Claude picks | |

**User's choice:** Name, type, institution, last 4, owners, status

---

## Category Icon & Colour UX

| Option | Description | Selected |
|--------|-------------|----------|
| Searchable Lucide icon picker | Popover with search + icon grid | ✓ |
| Free-form text input | User types Lucide icon name directly | |
| Emoji only | No Lucide — users type/paste emoji | |

**User's choice:** Searchable Lucide icon picker

---

| Option | Description | Selected |
|--------|-------------|----------|
| Preset palette | 10–12 colour swatches, no hex input | ✓ |
| Colour picker + hex input | Full colour picker | |
| Preset palette + custom hex | Swatches with "Other" hex option | |

**User's choice:** Preset palette (10–12 swatches)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Drag and drop (ReUI Sortable) | dnd-based reorder via ReUI Sortable component | ✓ |
| Up/down arrow buttons | ↑↓ buttons per row | |
| You decide | Claude picks | |

**User's choice:** ReUI Sortable — https://reui.io/docs/components/base/sortable
**Notes:** User explicitly referenced ReUI's Sortable component for both categories and merchant rules.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Settings sub-pages | Settings → Categories & Tags; Settings → Merchant Rules | ✓ |
| Inline within Transactions | Contextual management in transaction form | |
| You decide | Claude picks | |

**User's choice:** Settings sub-pages

---

| Option | Description | Selected |
|--------|-------------|----------|
| Combobox with 'Create X' option | shadcn Combobox with create-inline option | ✓ |
| Multi-select chips input | Chip-based input with Enter to create | |
| You decide | Claude picks | |

**User's choice:** Combobox with "Create X" option

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error on blur | Client-side regex validate on blur, block submit if invalid | ✓ |
| API-side validation only | No client-side validation | |
| You decide | Claude picks | |

**User's choice:** Inline error on blur (client-side) + API-side as backup

---

## Claude's Discretion

- Exact colour values for preset category palette
- Lucide icon picker grid layout / pagination
- Sidebar active-state styling
- Account slide-over sheet layout
- Loading and error states for all CRUD forms

## Deferred Ideas

None raised during discussion.
