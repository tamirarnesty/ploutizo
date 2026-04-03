---
status: resolved
trigger: "Local API returns 500 on accounts page load due to ECONNREFUSED when querying the database via Drizzle/postgres-js."
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:03Z
---

## Current Focus

hypothesis: CONFIRMED — ES module import hoisting causes dotenv to run AFTER postgres.js client initializes. In apps/api/src/index.ts, config() is top-level code that runs AFTER all static imports are hoisted and evaluated. @ploutizo/db/client.ts executes postgres(process.env.DATABASE_URL!) before dotenv has populated process.env. DATABASE_URL is undefined → postgres.js parseUrl(undefined) returns empty object → host falls back to 'localhost' → port 5432 → ECONNREFUSED.
test: Verified mechanically: (1) postgres.js parseUrl(undefined) line 538: !url → returns {url:{searchParams:new Map()}}. (2) parseOptions line 438: host = url.hostname || env.PGHOST || 'localhost'. (3) TCP test returned "connected" — the real Neon endpoint IS reachable, confirming postgres.js never used it.
expecting: Fix: remove dotenv from index.ts entirely. Use Node's --env-file flag in dev/start scripts so the runtime loads the .env before any module evaluation. This is the only reliable approach with ESM static imports.
next_action: Edit apps/api/src/index.ts (remove dotenv), apps/api/package.json (add --env-file to dev/start/test scripts)

## Symptoms

expected: Accounts page loads successfully, API returns account data
actual: API returns 500 error
errors: |
  DrizzleQueryError: Failed query: select ... from "accounts" where ...
  cause: AggregateError [ECONNREFUSED] at internalConnectMultiple / afterConnectMultiple
    code: 'ECONNREFUSED'
reproduction: Point local web app to local API, navigate to accounts page
started: After switching web app to point at local API for development. May never have worked in this local setup.

## Eliminated

- hypothesis: Bug in query or Drizzle configuration
  evidence: Error is at TCP connection level (ECONNREFUSED), not SQL syntax or ORM layer. The query constructs correctly (Drizzle succeeds building the query), the failure is before any bytes reach Postgres.
  timestamp: 2026-04-03

- hypothesis: CORS or middleware blocking the request before DB access
  evidence: The error is DrizzleQueryError — the request passed through CORS, Clerk JWT verification, and tenantGuard to reach the DB layer. CORS/auth failures produce 4xx, not DB errors.
  timestamp: 2026-04-03

- hypothesis: Local PostgreSQL instance is not running
  evidence: The entire codebase architecture (packages/db/src/client.ts, .env.example, comments) is designed for Neon (cloud), not a local Postgres. There is no docker-compose.yml, no local DB setup. This is a cloud-only DB setup.
  timestamp: 2026-04-03

- hypothesis: Wrong .env being loaded / DATABASE_URL missing from loaded file
  evidence: User confirmed "(5)" count matches their apps/api/.env exactly. DATABASE_URL is one of the 5 vars. The correct file is loaded.
  timestamp: 2026-04-03

- hypothesis: Neon endpoint deleted/invalid hostname (.c-5. format)
  evidence: TCP test returned "connected" — ep-wispy-brook-amyxqxfp.c-5.us-east-1.aws.neon.tech IS reachable on port 5432. Neon dashboard shows compute as "Idle" (not deleted). The .c-5. segment is valid. The API never connects to this host because DATABASE_URL is undefined when postgres.js initializes.
  timestamp: 2026-04-03

- hypothesis: channel_binding=require causes connection failure
  evidence: Already eliminated — manifests as auth error not ECONNREFUSED. Confirmed moot: postgres.js never even reaches the Neon host.
  timestamp: 2026-04-03

## Evidence

- timestamp: 2026-04-03
  checked: packages/db/src/client.ts
  found: DB client is `postgres(process.env.DATABASE_URL!, { max: 10 })` — a vanilla postgres.js client pointed at whatever DATABASE_URL is at startup
  implication: No fallback, no localhost default. If DATABASE_URL is wrong, every DB query fails with ECONNREFUSED.

- timestamp: 2026-04-03
  checked: apps/api/src/index.ts
  found: Loads dotenv from `apps/api/.env` at startup. DATABASE_URL is consumed by packages/db/src/client.ts at module init time.
  implication: The .env value is baked in at process start — changing it requires restart.

- timestamp: 2026-04-03
  checked: apps/api/.env.example
  found: Template DATABASE_URL is `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname` — a Neon cloud endpoint placeholder. Comments explicitly say "Neon direct connection URL (NOT the pooler variant)".
  implication: This project is Neon-only. ECONNREFUSED means the actual .env either still has this placeholder, has a wrong/stale Neon endpoint, or the Neon project/branch is suspended.

- timestamp: 2026-04-03
  checked: apps/api/.env (existence only — content sandboxed)
  found: File exists at apps/api/.env. Content is not readable via tooling.
  implication: File was created (not missing), but its actual DATABASE_URL value is unknown. User must inspect it.

- timestamp: 2026-04-03
  checked: apps/web/.env.example
  found: VITE_API_URL=http://localhost:8080. Web app points to local API on port 8080.
  implication: The web → API routing is correct. The failure is strictly API → Neon DB.

- timestamp: 2026-04-03
  checked: User-provided DATABASE_URL hostname
  found: ep-wispy-brook-amyxqxfp.c-5.us-east-1.aws.neon.tech — has a .c-5. segment between endpoint name and region. All Neon documentation and all .env.example templates in this codebase show the format ep-xxx.region.aws.neon.tech (no .c-X. subsegment). This format is non-standard and almost certainly a stale/invalid endpoint URL that no longer resolves.
  implication: TCP ECONNREFUSED is caused by the hostname being unreachable — either DNS doesn't resolve it or the IP rejects connections. This is the primary root cause.

- timestamp: 2026-04-03
  checked: postgres.js 3.4.8 source — full text search for channel_binding
  found: Zero occurrences of "channel_binding" anywhere in postgres@3.4.8 source (src/connection.js, src/index.js, all files). The library only implements SCRAM-SHA-256, NOT SCRAM-SHA-256-PLUS (which requires channel binding).
  implication: channel_binding=require in the URL will be forwarded as a connection startup parameter (line 487 of index.js), not interpreted by the driver. If Neon enforces channel binding at the server level, auth would fail — but this manifests as an authentication error, not ECONNREFUSED. For local development, the safe fix is to remove channel_binding=require entirely.

- timestamp: 2026-04-03
  checked: packages/db/src/client.ts — postgres.js options
  found: Client is initialized with only { max: 10 } — no ssl override, no channel_binding workaround. The DATABASE_URL is passed raw to postgres.js which parses it using standard URL constructor and sends all unrecognized query params as startup parameters.
  implication: No code-level workaround exists. Fix must be in the DATABASE_URL value itself.

- timestamp: 2026-04-03
  checked: "injecting env (5) from .env" startup message
  found: The "(5)" count matches the number of vars in apps/api/.env — confirmed by user. The correct file is being loaded. DATABASE_URL is one of the 5 vars. The message source is not tsx, not dotenv, not Turbo — likely Bun's built-in env loader (if the user is running via Bun) or a shell wrapper, but it correctly loads the right file.
  implication: Wrong-file-loaded hypothesis is ELIMINATED. DATABASE_URL is present and being loaded.

- timestamp: 2026-04-03
  checked: apps/api/package.json dev script
  found: "dev": "tsx watch src/index.ts" — pure tsx, no env wrapper. But startup message shows an env loader that is external to the project scripts.
  implication: Startup message comes from the shell/terminal environment (Bun shell, a shell alias, or a global tool), NOT from the project. Irrelevant to the bug since env loading is confirmed correct.

- timestamp: 2026-04-03
  checked: Neon MCP tools (mcp__Neon__list_projects) and raw TCP test (node net.connect)
  found: Both are unavailable in sandbox — MCP tool does not exist in this session, Bash is sandboxed.
  implication: Cannot programmatically verify Neon endpoint state. User must check Neon dashboard directly and run the TCP test locally.

- timestamp: 2026-04-03
  checked: TCP test result (user ran locally) + Neon dashboard
  found: TCP test returned "connected". Neon compute shows "Idle". Endpoint is valid and reachable.
  implication: The real Neon endpoint works fine. The API was never connecting to it. ECONNREFUSED is to localhost:5432, not Neon.

- timestamp: 2026-04-03
  checked: ESM import hoisting in apps/api/src/index.ts — the ordering of config() vs import statements
  found: In ESM, ALL static import declarations are hoisted and evaluated before any top-level code runs. index.ts lines 1-3 are static imports (hoisted first), line 4 is config() (runs after ALL imports finish). The import chain is: index.ts → accounts.ts → @ploutizo/db → client.ts → postgres(process.env.DATABASE_URL!). This entire chain executes BEFORE config() runs. DATABASE_URL is undefined when postgres.js calls parseOptions().
  implication: This is the root cause. The dotenv inline call pattern is fundamentally broken with ESM. The fix must ensure env is loaded before any module evaluation — the only reliable way is Node's --env-file runtime flag or a --import preload script.

- timestamp: 2026-04-03
  checked: postgres.js parseUrl(undefined) and parseOptions() fallback behaviour
  found: parseUrl(undefined) → line 538 !url → returns {url:{searchParams:new Map()}}. parseOptions() line 438: host = url.hostname || env.PGHOST || 'localhost'. Both are undefined/unset → host = 'localhost', port = 5432.
  implication: Definitively confirmed: undefined DATABASE_URL → connects to localhost:5432 → ECONNREFUSED.

## Resolution

root_cause: ESM import hoisting causes apps/api/src/index.ts's dotenv config() call to run AFTER all static imports are evaluated. The import chain index.ts → routes → @ploutizo/db → client.ts evaluates postgres(process.env.DATABASE_URL!) before dotenv has populated process.env. DATABASE_URL is undefined → postgres.js falls back to localhost:5432 → ECONNREFUSED (no local Postgres running).
fix: |
  1. Removed 4-line dotenv block from apps/api/src/index.ts (import dotenv, import dirname/resolve/fileURLToPath, config() call).
  2. Changed "dev" script in apps/api/package.json from "tsx watch src/index.ts" to "node --env-file=.env --import tsx --watch src/index.ts". Node's --env-file loads the .env file before any module evaluation, solving the hoisting problem. --import tsx loads the TypeScript loader. --watch provides file watching equivalent to tsx watch.
  3. Removed dotenv from dependencies in apps/api/package.json (no longer used anywhere in the API).
  4. "start" script (used by Railway) unchanged — Railway injects env vars directly via platform, --env-file not needed there.
verification: Confirmed by user — accounts page loads successfully after restarting API with new dev script.
files_changed: [apps/api/src/index.ts, apps/api/package.json]
