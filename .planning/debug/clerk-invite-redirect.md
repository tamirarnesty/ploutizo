---
status: resolved
trigger: |
  Invite member from settings sends callback URL to
  https://daring-dory-5.clerk.accounts.dev/v1/tickets/accept?ticket=<jwt>.
  User believes prod behaves the same. Why doesn't it redirect back to the app?
created: 2026-05-13
updated: 2026-05-13
resolved: 2026-05-13
---

## Symptoms

1. **Expected:** After invitee accepts the invitation, browser lands in the Ploutizo app (e.g. home or onboarding).
2. **Actual:** Flow stays on Clerk / does not return to the app after ticket acceptance (exact end state TBD — user question implies missing redirect).
3. **Errors:** (none reported)
4. **Timeline:** Current dev instance `daring-dory-5.clerk.accounts.dev`; user assumes production equivalent.
5. **Reproduction:** Settings → invite member → open email link → accept flow.

## Current Focus

- **hypothesis:** Invitations are created without `redirect_url`, so Clerk completes the ticket flow using instance defaults (hosted Account Portal / sign-in) instead of sending the user to the SPA. The `*.clerk.accounts.dev/v1/tickets/accept` URL is normal; redirect back requires an explicit allowed app URL.
- **next_action:** Confirm Clerk Dashboard allowlist includes app origin; add `redirect_url` to `POST /v1/organizations/{id}/invitations` in `inviteMember` (e.g. from env) if product requires return to app.

## Evidence

- timestamp: 2026-05-13 — `apps/api/src/services/households.ts` `inviteMember` body is only `{ email_address, role }` (no `redirect_url`).
- timestamp: 2026-05-13 — Clerk docs: create org invitation supports `redirect_url` for post-invitation redirection (must be allowlisted).

## Eliminated

- (none yet)

## Resolution

- root_cause: `inviteMember` called Clerk org invitations API without `redirect_url`, so post-accept navigation fell back to Clerk defaults. Separately, the chosen URL must be allowlisted in the Clerk Dashboard.
- fix: Send optional `redirect_url` from `CLERK_INVITE_REDIRECT_URL` when set; document in `apps/api/.env.example`.
- verification: `pnpm --filter api test` — invitations tests assert Clerk POST body with/without `redirect_url`.
- files_changed: `apps/api/src/services/households.ts`, `apps/api/.env.example`, `apps/api/src/__tests__/households.test.ts`

## Specialist Review

- (not run — fix is straightforward Clerk API contract)
