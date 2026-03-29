---
phase: 1
slug: foundation-auth-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test --filter=./apps/api --filter=./packages/validators` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --filter=./apps/api --filter=./packages/validators`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 1-01-01 | 01 | 1 | Monorepo scaffold | build | `pnpm build` | ⬜ pending |
| 1-01-02 | 01 | 1 | Package boundaries | typecheck | `pnpm typecheck` | ⬜ pending |
| 1-02-01 | 02 | 1 | DB client init | unit | `pnpm test --filter=./packages/db` | ⬜ pending |
| 1-02-02 | 02 | 1 | Transaction support | integration | `pnpm test --filter=./packages/db` | ⬜ pending |
| 1-03-01 | 03 | 2 | Clerk middleware | unit | `pnpm test --filter=./apps/api` | ⬜ pending |
| 1-03-02 | 03 | 2 | Satellite domains | manual | — | ⬜ pending |
| 1-04-01 | 04 | 3 | tenantGuard() | unit | `pnpm test --filter=./apps/api` | ⬜ pending |
| 1-04-02 | 04 | 3 | Health endpoint | integration | `pnpm test --filter=./apps/api` | ⬜ pending |
| 1-05-01 | 05 | 3 | seedOrgCategories | unit | `pnpm test --filter=./packages/db` | ⬜ pending |
| 1-05-02 | 05 | 3 | seedOrgMerchantRules | unit | `pnpm test --filter=./packages/db` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Compliance

All tasks in this phase use inline TDD: each TDD task carries a `<behavior>` block defining test expectations before implementation, and an `<automated>` verify command that runs the test suite. There are no Wave 0 pre-stub files required — tests are co-written with their implementations in the same task.

**Wave 0 pre-stubs originally listed (all resolved via inline TDD):**
- `apps/api/src/__tests__/tenantGuard.test.ts` — written inline in Plan 04 Task 1
- `apps/api/src/__tests__/health.test.ts` — written inline in Plan 03 Task 2
- `packages/db/src/__tests__/seeds.test.ts` — written inline in Plan 05 Task 2
- `packages/db/src/__tests__/client.test.ts` — written inline in Plan 02 (DB client plan)

All task verify blocks carry `<automated>` commands. No 3+ consecutive tasks exist without an automated verify command.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clerk satellite domain session propagation | Subdomain auth | Requires live Clerk + DNS config | Navigate to `{subdomain}.ploutizo.app` while signed in — verify session active; navigate to unjoined subdomain — verify 403 |
| `VITE_DATABASE_URL` not in browser bundle | Env var isolation | Bundle analysis required | Run `pnpm build`, inspect `apps/web/dist/assets/*.js` — grep must return no match for `DATABASE_URL` |
| Railway pre-deploy migration | CI/CD integration | Requires Railway environment | Deploy to Railway staging — verify migration runs before app starts |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (inline TDD pattern — no Wave 0 stubs needed)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
