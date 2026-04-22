# Deferred Items — Phase 03.4.1

## From Plan 05

### D1 — ContributionFields TYPE — MemberName label format

**Found during:** Task 2
**File:** apps/web/src/components/transactions/ContributionFields.tsx
**Issue:** The plan specifies `{account.type.toUpperCase()} — {account.ownerMemberName}` format for contribution account labels. The `Account` type and `GET /api/accounts` response do not include `ownerMemberId` or `ownerMemberName`. Ownership is stored in the M2M `account_members` table.
**Current behavior:** Using `{account.type.toUpperCase()} — {account.name}` (AccountName instead of MemberName). Account names typically include the owner's name (e.g., "Emily TFSA").
**Fix required:** Extend `GET /api/accounts` to join `account_members` → `org_members` and return `ownerMemberName` on the Account type. Requires API change + type update in `packages/types/src/index.ts`.

### D2 — toApiPayload contribution case missing counterpartAccountId

**Found during:** Task 2
**File:** apps/web/src/components/transactions/hooks/useTransactionForm.ts (line 90-91)
**Issue:** The `contribution` case in `toApiPayload` returns `base` only, not including `counterpartAccountId`. After Plan 05, `ContributionFields` collects `counterpartAccountId` from the user. This value won't be included in the API payload for contribution transactions.
**Fix required:** In `toApiPayload`, change the `contribution` case to:
```typescript
case 'contribution':
  return { ...base, counterpartAccountId: value.counterpartAccountId || undefined }
```
This is outside Plan 05's declared `files_modified` scope. Should be addressed in Plan 06 when TransactionForm.tsx is touched.

## From UAT — 2026-04-21

### D-UAT-01 — Assignee toggle chips: first name only, single line flow

**Found during:** UAT session post plan-10
**File:** apps/web/src/components/transactions/AssigneeSection.tsx
**Issue:** Toggle chips show full display name ("Tamir MultiMember") — should show first name only ("Tamir"). Chips should flow on one line, wrapping only when space runs out.
**Suggested fix:** `displayName.split(' ')[0]` for chip label. `flex-wrap` is likely already set; confirm names aren't forcing overflow.

### D-UAT-02 — Split section redesign

**Found during:** UAT session post plan-10
**File:** apps/web/src/components/transactions/SplitSection.tsx
**Issue:** Multiple problems with the split customization UI:
1. "Add assignee" dropdown is redundant — assignees are chosen via toggle chips above; remove it
2. Input fields should use InputGroupAddOn to show $ or % decorator (not plain number inputs)
3. Member names are truncated ("Tamir Mul...") — needs min-w-0 + truncate on the name span
4. Auto-remainder: when user changes one split %, the other(s) should auto-adjust to sum to 100%. Currently shows a validation error instead of auto-calculating the remainder
5. Error should only appear when auto-calculation cannot resolve (e.g., >2 members with conflicting manual values), not on normal edits

**Priority:** Medium — UX regression, should be addressed in next gap closure cycle
