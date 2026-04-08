---
status: resolved
trigger: "edit account sheet does not animate when opening/closing — it simply appears and disappears instantly. The add account sheet animates correctly."
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — `key={editingAccount?.id ?? "new"}` on AccountSheet caused React to unmount/remount the entire sheet component on edit open, so Base UI's Dialog mounted with open=true and never fired data-starting-style entrance animation
test: moved key from AccountSheet to AccountFormInner to preserve sheet lifecycle while still resetting form state
expecting: sheet now persists across open/close, Base UI fires animation; form reinitializes correctly when switching accounts
next_action: verify fix

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: same slide-in/slide-out animation as the add account sheet
actual: sheet appears and disappears instantly with no animation
errors: none
reproduction: open the edit account sheet (triggered from an account list item or action menu)
started: never worked — animation has always been broken on the edit sheet

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: CSS classes missing or overridden on edit sheet
  evidence: single AccountSheet component used for both add and edit — same SheetContent className in both paths
  timestamp: 2026-04-08T00:01:00Z

- hypothesis: Different Sheet wrapper or Dialog component for edit vs add
  evidence: single AccountSheet component used for both cases, isEditing is just a boolean derived from account !== null
  timestamp: 2026-04-08T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-04-08T00:00:30Z
  checked: Accounts.tsx — the parent component managing open state
  found: key={editingAccount?.id ?? "new"} on AccountSheet; when a row is clicked, editingAccount changes from null to an account object, changing the key from "new" to the account's id
  implication: React unmounts the old AccountSheet and mounts a brand new one with open={true} already set

- timestamp: 2026-04-08T00:00:40Z
  checked: packages/ui/src/components/sheet.tsx — Sheet component implementation
  found: Uses @base-ui/react/dialog with data-starting-style / data-ending-style for animations; these fire based on open/close lifecycle transitions within a persistent component instance
  implication: When a component mounts with open=true, Base UI has no "was closed before" state to transition from — data-starting-style is never applied — animation is skipped entirely

- timestamp: 2026-04-08T00:00:50Z
  checked: AccountForm.tsx — AccountFormInner uses useAppForm with defaultValues computed from account at mount time
  found: This is why the key was originally added — without it, switching accounts would leave stale form values
  implication: Fix must preserve Sheet mounting lifecycle while still resetting form state on account change

- timestamp: 2026-04-08T00:01:00Z
  checked: Fix applied
  found: Removed key from AccountSheet in Accounts.tsx; added key={account?.id ?? "new"} to AccountFormInner in AccountForm.tsx
  implication: Sheet wrapper persists (animation works); form subtree remounts when account changes (fresh defaultValues)

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: key={editingAccount?.id ?? "new"} was placed on the AccountSheet component in Accounts.tsx. Every time a different account was opened for editing, the key changed, causing React to unmount the old AccountSheet and mount a fresh one with open={true} already set. Base UI's Dialog animation system (data-starting-style / data-ending-style) requires a closed→open transition on a persistent instance to fire the entrance animation — a freshly-mounted-open component skips it entirely.

fix: Removed key from AccountSheet (allowing the Sheet to persist and animate). Moved key={account?.id ?? "new"} down to AccountFormInner inside AccountForm.tsx — this still resets form defaultValues when switching accounts, but only remounts the form subtree, not the Sheet wrapper.

verification: confirmed by user — animation and form behavior both work correctly in the browser
files_changed:
  - apps/web/src/components/accounts/Accounts.tsx
  - apps/web/src/components/accounts/AccountForm.tsx
