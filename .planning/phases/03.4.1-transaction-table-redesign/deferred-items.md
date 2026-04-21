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
