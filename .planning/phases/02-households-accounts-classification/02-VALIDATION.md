---
phase: 2
slug: households-accounts-classification
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/api/vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test --filter @ploutizo/api -- --run` |
| **Full suite command** | `pnpm test --filter @ploutizo/api -- --run && pnpm test --filter @ploutizo/validators -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --filter @ploutizo/api -- --run`
- **After every plan wave:** Run `pnpm test --filter @ploutizo/api -- --run && pnpm test --filter @ploutizo/validators -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

Test files are written in the same plan task that creates the routes (TDD: tests first, then implementation).
All test files live in `apps/api/src/__tests__/` — not in `apps/api/src/routes/`.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 2-01-02 | 01 | 1 | §1 Households & §2 Accounts | unit | `pnpm test --filter @ploutizo/api -- --run` | `apps/api/src/__tests__/accounts.test.ts` | ⬜ pending |
| 2-01-02 | 01 | 1 | §1 Households & §2 Accounts | unit | `pnpm test --filter @ploutizo/api -- --run` | `apps/api/src/__tests__/households.test.ts` | ⬜ pending |
| 2-02-01 | 02 | 2 | §1 Households UI | e2e-manual | see Manual | N/A | ⬜ pending |
| 2-03-01 | 03 | 3 | §2 Accounts UI | build-check | `pnpm build --filter @ploutizo/web` | N/A | ⬜ pending |
| 2-04-01 | 04 | 4 | §3 Categories/Tags & §9 Merchant Rules | unit | `pnpm test --filter @ploutizo/api -- --run` | `apps/api/src/__tests__/categories.test.ts` | ⬜ pending |
| 2-04-01 | 04 | 4 | §3 Categories/Tags | unit | `pnpm test --filter @ploutizo/api -- --run` | `apps/api/src/__tests__/tags.test.ts` | ⬜ pending |
| 2-04-01 | 04 | 4 | §9 Merchant Rules | unit | `pnpm test --filter @ploutizo/api -- --run` | `apps/api/src/__tests__/merchant-rules.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 test files are written as the first step of each TDD task (RED phase) — they are part of Plan 01 Task 2 and Plan 04 Task 1, not a separate pre-execution step.

- [x] `apps/api/src/__tests__/accounts.test.ts` — written in Plan 01 Task 2 (TDD RED phase)
- [x] `apps/api/src/__tests__/households.test.ts` — written in Plan 01 Task 2 (TDD RED phase)
- [x] `apps/api/src/__tests__/categories.test.ts` — written in Plan 04 Task 1 (TDD RED phase)
- [x] `apps/api/src/__tests__/tags.test.ts` — written in Plan 04 Task 1 (TDD RED phase)
- [x] `apps/api/src/__tests__/merchant-rules.test.ts` — written in Plan 04 Task 1 (TDD RED phase)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invited member accepts email invitation and lands on /dashboard | §1 Households | Requires real email flow via Clerk + afterSignInUrl='/dashboard' configured | Send invitation from UI, accept in test email client, verify lands on /dashboard with household data visible |
| `<OrganizationSwitcher />` switches active org context | §1 Households | Browser state + auth context | Create 2 orgs, switch between them, verify data scoped correctly |
| Tag created inline is reusable in next form | §3 Tags | Frontend state management | Create tag during transaction form, close, open new form, verify tag appears |
| Mobile sidebar drawer opens/closes via hamburger | §1 App Shell D-06 | Requires browser viewport resize | Resize to mobile width, verify hamburger visible, click to open drawer, verify overlay, click outside to close |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
