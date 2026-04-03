---
status: partial
phase: 02-households-accounts-classification
source: [02-VERIFICATION.md]
started: 2026-04-01T21:00:00Z
updated: 2026-04-01T21:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Household invitation flow (two accounts)
expected: Both users see /dashboard with the sidebar, accounts list, and shared category data after signing in with afterSignInUrl='/dashboard'
result: [pending]

### 2. eachPersonPaysOwn flag visible in accounts list
expected: Account is visible with correct status; the eachPersonPaysOwn flag is stored and returned by GET /api/accounts
result: [pending]

### 3. Invalid regex onBlur behavior on merchant-rules page
expected: Red border appears on pattern field, 'Invalid regular expression.' error shown, Save rule button is disabled
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
