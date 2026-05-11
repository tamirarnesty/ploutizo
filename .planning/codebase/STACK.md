# Technology Stack

**Analysis Date:** 2026-05-11

## Languages

**Primary:**
- TypeScript 6.x — All source code across all apps and packages

**Secondary:**
- CSS (Tailwind v4 utility classes) — Styling in `apps/web` and `packages/ui`

## Runtime

**Environment:**
- Node.js 22.14.0 (pinned in `.node-version`)
- ESM-only (`"type": "module"` in all workspace packages)

**Package Manager:**
- pnpm 9.15.9 (pinned via `packageManager` field in root `package.json`)
- Lockfile: `pnpm-lock.yaml` present

## Monorepo Structure

**Orchestration:** Turborepo 2.9.5
- Config: `turbo.json`
- Build pipeline: `build → typecheck → lint → test`
- Dev: persistent, cache disabled
- Task inputs/outputs: `.output/**` for builds

**Workspace packages:**
- `apps/api` — Hono API server
- `apps/web` — TanStack Start SPA
- `packages/db` — Database client and schema (`@ploutizo/db`)
- `packages/ui` — Shared component library (`@ploutizo/ui`)
- `packages/types` — Shared TypeScript types (`@ploutizo/types`)
- `packages/validators` — Zod validators (`@ploutizo/validators`)

## Frameworks

**Frontend (`apps/web`):**
- TanStack Start 1.167.x — React SPA framework (NOT Next.js, NOT RSC)
- TanStack Router 1.168.x — File-based routing, `routeTree.gen.ts` is generated
- React 19.2.x — UI library
- Vite 8.x — Dev server and bundler
- Config: `apps/web/vite.config.ts`

**Backend (`apps/api`):**
- Hono 4.12.x — HTTP framework
- `@hono/node-server` 1.19.x — Node.js adapter
- `@hono/zod-validator` 0.7.x — Request validation middleware
- tsup 8.x — Build tool (ESM output only)
- tsx 4.x — TypeScript runner for dev (`node --import tsx --watch`)

**Database:**
- Drizzle ORM 0.45.x — Query builder and schema definition
- `drizzle-kit` 0.31.x — Migrations and schema push (root-level config: `drizzle.config.ts`)
- Dialect: PostgreSQL

## Testing

**Framework:** Vitest 4.1.x
- Config: `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`
- Environment: `node`
- Pattern: `src/**/*.test.ts`
- Run: `pnpm test` or `pnpm --filter <pkg> test`

## Key Dependencies

**UI Component System (`packages/ui`):**
- shadcn 4.2.x — Component generator (do not modify generated components)
- radix-ui 1.4.x — Headless UI primitives
- `@base-ui/react` 1.3.x — Base UI primitives (ReUI components)
- class-variance-authority 0.7.x — Variant styling
- tailwind-merge 3.5.x — Class merging
- clsx 2.1.x — Conditional classes
- tw-animate-css 1.4.x — Animation utilities
- next-themes 0.4.x — Theme switching (`ThemeProvider`)
- sonner 2.0.x — Toast notifications (`Toaster`)

**Data & Forms:**
- TanStack Query 5.95.x — Server state management (60s global `staleTime`)
- TanStack Form 1.28.6 — Form state (`useAppForm` composition hook in `packages/ui`)
- TanStack Table 8.21.x — Data grid
- TanStack Virtual 3.13.x — Virtualization (in `packages/ui`)
- Zod 4.3.x — Schema validation (all packages)

**Auth:**
- `@clerk/tanstack-react-start` 1.0.x — Clerk client for web app
- `@clerk/hono` 0.1.x — Clerk middleware for API
- `@clerk/ui` 1.3.x — Clerk-themed UI components

**Drag & Drop (`packages/ui`):**
- `@dnd-kit/core` 6.3.x
- `@dnd-kit/sortable` 10.0.x
- `@dnd-kit/modifiers` 9.0.x

**Utilities:**
- date-fns 4.1.x — Date manipulation
- lucide-react 1.7.x — Icons
- neverthrow 8.2.x — Result type (declared in `apps/api` deps, available but not yet used in source)

**Fonts (`packages/ui`):**
- `@fontsource-variable/geist`
- `@fontsource-variable/noto-sans`
- `@fontsource-variable/noto-serif`

**Infrastructure:**
- svix 1.90.x — Webhook signature verification (Clerk webhooks)

## Configuration

**Environment:**
- `apps/api`: `process.env.*` via `--env-file=.env` dev flag
- `apps/web`: `import.meta.env.VITE_*` (Vite env vars)
- Root `.env` file present (never read contents)

**Required variables:**
- `DATABASE_URL` — PostgreSQL connection string (packages/db)
- `CLERK_SECRET_KEY` — Clerk backend secret (apps/api)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (apps/api)
- `CLERK_WEBHOOK_SECRET` — Svix webhook verification secret (apps/api)
- `VITE_API_URL` — API base URL used by web app (apps/web)
- `PORT` — API listen port (default: 8080)

**Build:**
- Web: `vite build` → `.output/` (Nitro output)
- API: `tsup` → `dist/` (ESM, workspace deps inlined via `noExternal`)

## TypeScript Configuration

**Root:** `tsconfig.json` present
**Per-package configs:**
- `apps/api/tsconfig.json` — `target: ES2022`, `module: ESNext`, `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- `apps/web/tsconfig.json` — Present
- All packages: `tsconfigPaths` enabled via Vite resolver

**Type checking:** `pnpm turbo typecheck` (runs `tsc --noEmit` across all packages in dependency order)

## Code Quality

**Linting:** ESLint 10.x with `@tanstack/eslint-config`
**Formatting:** Prettier 3.8.x + `prettier-plugin-tailwindcss` 0.7.x
**Git hooks:** Lefthook 2.1.x (installed via `prepare` script)
**Shadcn CLI:** Available at root for component generation (`pnpm dlx shadcn@latest`)

## Platform Requirements

**Development:**
- Node.js >= 22 (enforced via `engines` field)
- pnpm 9.15.9

**Production:**
- Railway (both `apps/api` and `apps/web` have `railway.toml`)
- API: RAILPACK builder, `node apps/api/dist/index.js`
- Web: RAILPACK builder, `node apps/web/.output/server/index.mjs`
- Both: `us-east4-eqdc4a` region, 1 replica

---

*Stack analysis: 2026-05-11*
