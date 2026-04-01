---
status: resolved
trigger: "clerk-signin-no-signup-option — SignIn component shows no sign-up link"
created: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:10:00Z
---

## Current Focus

hypothesis: CLERK_SIGN_UP_URL is set to /sign-in (same as sign-in URL) in .env.example, AND there is no sign-up.$.tsx route. Clerk suppresses the sign-up link when the sign-up URL matches the sign-in URL or points to a non-existent route. Fix requires: (1) create sign-up.$.tsx with <SignUp />, (2) set CLERK_SIGN_UP_URL=/sign-up in env, (3) update __root.tsx isAuthRoute guard to include /sign-up.
test: confirmed by reading .env.example (CLERK_SIGN_UP_URL=/sign-in) and routes dir (no sign-up.$.tsx)
expecting: adding sign-up route + fixing env var will restore sign-up link in <SignIn /> component
next_action: apply fix — create sign-up.$.tsx, update .env.example, update __root.tsx guard

## Symptoms

expected: The Clerk `<SignIn />` component should display a "Don't have an account? Sign up" link. The splat route sign-in.$.tsx handles both flows.
actual: Component renders only sign-in form (Apple/Google OAuth + email/username + password + Continue button) with no sign-up option visible.
errors: No visible errors — UI just doesn't have the sign-up link
reproduction: Launch the app and navigate to the sign-in page
started: Unknown — may never have worked

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-31T00:05:00Z
  checked: apps/web/src/routes/ directory listing
  found: Only one auth route exists — sign-in.$.tsx. There is NO sign-up.$.tsx route.
  implication: Clerk's <SignIn /> component renders a "Sign up" link that navigates to the sign-up URL. If that URL doesn't have a route or a handler, the link may be suppressed or broken.

- timestamp: 2026-03-31T00:05:00Z
  checked: apps/web/.env.example
  found: CLERK_SIGN_UP_URL=/sign-in (same as CLERK_SIGN_IN_URL=/sign-in)
  implication: Both sign-in and sign-up are pointing to the SAME URL (/sign-in). Clerk uses CLERK_SIGN_UP_URL to construct the "Sign up" link in the <SignIn /> component. If sign-up URL equals sign-in URL, Clerk may suppress or skip rendering the sign-up link to avoid a circular UI. This is the most likely root cause.

- timestamp: 2026-03-31T00:05:00Z
  checked: apps/web/src/routes/__root.tsx
  found: authGuard redirect goes to "/sign-in/$" (splat route). isAuthRoute check: `location.pathname.startsWith("/sign-in")`. No /sign-up route protection exists.
  implication: The app only protects /sign-in routes. If a /sign-up route is added, it needs to be included in the isAuthRoute check.

- timestamp: 2026-03-31T00:05:00Z
  checked: apps/web/src/routes/sign-in.$.tsx
  found: Uses <SignIn /> with no additional props. No signUpUrl prop, no fallbackRedirectUrl prop.
  implication: Clerk should auto-read CLERK_SIGN_UP_URL / VITE_CLERK_SIGN_UP_URL env vars to set the sign-up link. But if that env var points to /sign-in, the link is suppressed.

- timestamp: 2026-03-31T00:05:00Z
  checked: Clerk docs pattern for TanStack React Start
  found: The recommended pattern requires BOTH a sign-in.$.tsx AND a sign-up.$.tsx route with <SignUp /> component. The <SignIn /> component links to the sign-up URL; that URL must be a valid route.
  implication: Without a sign-up route, the sign-up URL doesn't work. The workaround of setting CLERK_SIGN_UP_URL=/sign-in is what causes the sign-up link to be hidden — Clerk detects the circular reference and suppresses the link.

## Resolution

root_cause: Two compounding issues — (1) CLERK_SIGN_UP_URL was set to /sign-in (same as the sign-in URL), which causes Clerk to suppress the "Sign up" link in the <SignIn /> component since it would be circular. (2) No sign-up.$.tsx route existed, so even if the env var were corrected, clicking "Sign up" would 404.

fix: Three changes applied:
  1. Created apps/web/src/routes/sign-up.$.tsx with a <SignUp /> component matching the sign-in route pattern.
  2. Changed CLERK_SIGN_UP_URL from /sign-in to /sign-up in apps/web/.env.example.
  3. Updated __root.tsx auth guard to also allow /sign-up/* routes through without triggering the authGuard redirect (same as /sign-in/* are already allowed).

verification: Confirmed by user — sign-up route works correctly, clicking "Sign up" on the sign-in page navigates to /sign-up and renders the SignUp component.
files_changed:
  - apps/web/src/routes/sign-up.$.tsx (created)
  - apps/web/.env.example (CLERK_SIGN_UP_URL /sign-in → /sign-up)
  - apps/web/src/routes/__root.tsx (isAuthRoute guard extended to include /sign-up)
