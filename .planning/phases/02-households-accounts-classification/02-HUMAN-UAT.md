---
status: complete
phase: 02-households-accounts-classification
source: [02-VERIFICATION.md]
started: 2026-04-01T21:00:00Z
updated: 2026-04-14T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Household invitation flow (two accounts)
expected: Both users see /dashboard with the sidebar, accounts list, and shared category data after signing in with afterSignInUrl='/dashboard'
result: pass

### 2. eachPersonPaysOwn flag visible in accounts list
expected: Account is visible with correct status; the eachPersonPaysOwn flag is stored and returned by GET /api/accounts
result: issue
reported: "Advanced section is always collapsed — should auto-expand when eachPersonPaysOwn is true"
severity: minor

### 3. Invalid regex onBlur behavior on merchant-rules page
expected: Red border appears on pattern field, 'Invalid regular expression.' error shown, Save rule button is disabled
result: issue
reported: "Save button is not visually disabled when regex is invalid — error shows and submit is blocked, but button appears enabled"
severity: minor

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Advanced section is open when editing an account with eachPersonPaysOwn=true"
  status: failed
  reason: "User reported: Advanced section is always collapsed — should auto-expand when eachPersonPaysOwn is true"
  severity: minor
  test: 2
  root_cause: "AccountForm.tsx:118 — useState(false) always initializes collapsed; should be useState(account?.eachPersonPaysOwn ?? false)"
  artifacts:
    - path: "apps/web/src/components/accounts/AccountForm.tsx"
      issue: "line 118: const [advancedOpen, setAdvancedOpen] = useState(false)"
  missing:
    - "Change to useState(account?.eachPersonPaysOwn ?? false)"
  debug_session: ""

- truth: "Save rule button is disabled when form has validation errors"
  status: failed
  reason: "User reported: Save button not visually disabled on invalid regex — error shows and submit is silently blocked but button appears active"
  severity: minor
  test: 3
  root_cause: "RuleForm.tsx:231 — disabled={isSubmitting} only; missing canSubmit check"
  artifacts:
    - path: "apps/web/src/components/settings/RuleForm.tsx"
      issue: "line 231: disabled={isSubmitting} — should be disabled={isSubmitting || !canSubmit}"
  missing:
    - "Subscribe to canSubmit alongside isSubmitting and add to disabled condition"
  debug_session: ""
