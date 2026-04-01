# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## clerk-signin-no-signup-option — Clerk SignIn component suppresses sign-up link when CLERK_SIGN_UP_URL equals sign-in URL
- **Date:** 2026-03-31
- **Error patterns:** clerk, SignIn, sign-up, sign-up link missing, CLERK_SIGN_UP_URL, circular, no signup, sign-in route
- **Root cause:** Two compounding issues — (1) CLERK_SIGN_UP_URL was set to /sign-in (same as the sign-in URL), causing Clerk to suppress the "Sign up" link in the <SignIn /> component to avoid a circular UI. (2) No sign-up.$.tsx route existed, so even if the env var were corrected, the sign-up URL would 404.
- **Fix:** (1) Created apps/web/src/routes/sign-up.$.tsx with a <SignUp /> component. (2) Changed CLERK_SIGN_UP_URL from /sign-in to /sign-up in apps/web/.env.example. (3) Updated __root.tsx auth guard isAuthRoute check to also allow /sign-up/* through without triggering the redirect.
- **Files changed:** apps/web/src/routes/sign-up.$.tsx, apps/web/.env.example, apps/web/src/routes/__root.tsx
---
