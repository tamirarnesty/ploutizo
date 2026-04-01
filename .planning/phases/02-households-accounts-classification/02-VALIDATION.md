---
phase: 2
slug: households-accounts-classification
status: draft
nyquist_compliant: false
wave_0_complete: false
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | §1 Households | unit | `pnpm test --filter @ploutizo/api -- --run` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | §1 Households UI | e2e-manual | see Manual | N/A | ⬜ pending |
| 2-03-01 | 03 | 1 | §2 Accounts | unit | `pnpm test --filter @ploutizo/api -- --run` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | §3 Categories/Tags | unit | `pnpm test --filter @ploutizo/api -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/api/src/routes/households.test.ts` — unit stubs for household create + settings
- [ ] `packages/api/src/routes/accounts.test.ts` — unit stubs for account CRUD
- [ ] `packages/api/src/routes/categories.test.ts` — unit stubs for category CRUD
- [ ] `packages/api/src/routes/tags.test.ts` — unit stubs for tag CRUD
- [ ] `packages/api/src/routes/merchant-rules.test.ts` — unit stubs for merchant rule CRUD
- [ ] `packages/validators/src/__tests__/accounts.test.ts` — Zod schema validation tests
- [ ] `packages/validators/src/__tests__/merchant-rules.test.ts` — regex validation tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invited member accepts email invitation and sees household data | §1 Households | Requires real email flow via Clerk | Send invitation from UI, accept in test email client, verify household visible |
| `<OrganizationSwitcher />` switches active org context | §1 Households | Browser state + auth context | Create 2 orgs, switch between them, verify data scoped correctly |
| Tag created inline is reusable in next form | §3 Tags | Frontend state management | Create tag during transaction form, close, open new form, verify tag appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
