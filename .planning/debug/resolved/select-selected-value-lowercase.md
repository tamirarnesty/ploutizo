---
status: resolved
trigger: "All Select components across the app display the selected value in lowercase, while the dropdown options show correct capitalization"
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — SelectValue renders serializeValue(rawValue) because store.items is undefined (no items prop passed to SelectRoot), so resolveSelectedLabel falls through to the raw value string
test: N/A — root cause confirmed via source code trace
expecting: N/A
next_action: Await human verification that trigger now shows "Chequing", "Contains", etc. correctly

## Symptoms

expected: Selected value in the Select trigger should display with the same capitalization as the option labels (e.g., "Chequing", "Credit Card", "e-Transfer")
actual: Selected value shows in all-lowercase (e.g., "chequing") while the dropdown options show correct casing
errors: None — purely a display issue
reproduction: Open any form with a Select component (e.g., Account Form → Account type field). Select any option. Close the dropdown. The trigger shows the value in lowercase.
started: Unknown — likely always been this way (app-wide, not isolated to one component)

## Eliminated

- hypothesis: CSS text-transform:lowercase applied to select trigger
  evidence: Searched all CSS/TSX files in packages/ui and apps/web — no text-transform:lowercase found on select-related elements
  timestamp: 2026-04-08

## Evidence

- timestamp: 2026-04-08
  checked: packages/ui/src/components/select.tsx
  found: Uses @base-ui/react/select primitives. SelectValue wraps SelectPrimitive.Value with no custom children render.
  implication: SelectValue rendering depends entirely on Base UI's internal logic

- timestamp: 2026-04-08
  checked: @base-ui/react/select/value/SelectValue.js
  found: When no children prop provided, calls resolveSelectedLabel(value, items, itemToStringLabel). items comes from store state (set from SelectRoot's items prop).
  implication: If SelectRoot has no items prop, store.items is undefined → resolveSelectedLabel falls through

- timestamp: 2026-04-08
  checked: @base-ui/react/esm/utils/resolveValueLabel.js — resolveSelectedLabel function
  found: When items is undefined (not an Array, not a Record), the function hits fallback() → stringifyAsLabel(value, undefined) → serializeValue("chequing") → "chequing"
  implication: The raw value string is what gets shown, not the SelectItem children text

- timestamp: 2026-04-08
  checked: SelectItem.label prop type definition
  found: label prop on SelectItem is "Specifies the text label to use when the item is matched during keyboard text navigation" — NOT for SelectValue display
  implication: Adding label to SelectItem doesn't fix the trigger display

- timestamp: 2026-04-08
  checked: SelectValue.d.ts
  found: children can be a (value: any) => ReactNode function for formatting the displayed value
  implication: The correct fix is to pass a children function to <SelectValue> that maps the value to its label string

- timestamp: 2026-04-08
  checked: apps/web/src/components/accounts/AccountForm.tsx — SelectItem usage
  found: ACCOUNT_TYPES array has { value: "chequing", label: "Chequing" } etc. <SelectItem value={value}>{label}</SelectItem> — correct pattern but SelectValue has no children
  implication: Fix is to add children={(v) => ACCOUNT_TYPES.find(t => t.value === v)?.label ?? v} to <SelectValue>

## Resolution

root_cause: |
  **Immediate cause:** Base UI's SelectValue renders serializeValue(rawValue) — the raw lowercase slug — when
  no `items` prop is passed to SelectRoot and no children function is provided.

  **Why standard shadcn would not have this problem:** The shadcn Select component is generated against
  Radix UI's @radix-ui/react-select. Radix's SelectValue works fundamentally differently: it holds a ref to
  the DOM node of the currently selected SelectItem, then clones and renders that node's children (the label
  text, e.g. "Chequing") directly into the trigger. The raw `value` string ("chequing") never appears.

  **The divergence — commit cd7eb5a ("re-add reui components with correct @/ imports, remove shims"):**
  This commit swapped `import { Select as SelectPrimitive } from "radix-ui"` for
  `import { Select as SelectPrimitive } from "@base-ui/react/select"` across the entire select.tsx component.
  The file was originally created in commit 1708845 (feat(02-03)) as a standard shadcn component on Radix.
  The cd7eb5a migration rewrote it for Base UI to align with the broader Base UI adoption (dialog, sheet,
  collapsible, etc. all use Base UI in this project). The API surface looks nearly identical, but the
  internal rendering model for SelectValue changed completely.

  **Why Base UI works differently:** Base UI's SelectValue calls resolveSelectedLabel(value, storeItems).
  storeItems is only populated when you pass an `items` array prop directly to SelectRoot (the "headless
  data-driven" API). When you use JSX children (SelectItem elements) without a storeItems prop, storeItems
  is undefined, so resolveSelectedLabel falls through to serializeValue(value) — the raw string.
  Base UI does NOT implement Radix's DOM-cloning trick. It is a known, intentional API difference.

  **Summary:** This is not a shadcn configuration issue and not a CSS issue. It is a fundamental behavioral
  difference between Radix SelectValue (clones selected item DOM children) and Base UI SelectValue (resolves
  label from a store items array). The migration to Base UI in cd7eb5a introduced this gap for all Selects
  that use JSX children without a storeItems prop — which is every Select in this app.

fix: Added a children render function to every <SelectValue /> in the app: AccountForm uses ACCOUNT_TYPES.find lookup; RuleForm matchType uses MATCH_TYPE_LABELS[v]; RuleForm categoryId renders category name from categories array (or inline muted placeholder span when empty). data-grid-pagination SelectValue is unaffected — its value and display are the same numeric string.
verification: Human confirmed — all selects display correct capitalization in browser.
files_changed: [apps/web/src/components/accounts/AccountForm.tsx, apps/web/src/components/settings/RuleForm.tsx]
