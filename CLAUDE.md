# Project Instructions

## Stack

- **Framework:** TanStack Start + TanStack Router (React SPA — NOT Next.js, NOT RSC)
- **UI:** shadcn/ui + ReUI components from packages/ui
- **Data fetching:** TanStack Query (all server state)
- **Forms:** TanStack Form + Zod (useAppForm composition hook from packages/ui)
- **Styling:** Tailwind CSS v4
- **Database:** Neon serverless (@neondatabase/serverless WebSocket Pool) + Drizzle ORM
- **Auth:** Clerk (org-based tenancy)
- **API:** Hono (apps/api)

## Critical Constraints

- This project is a **React SPA** using TanStack Start/Router. It is NOT Next.js. RSC patterns, server actions, `React.cache()`, `next/dynamic`, and `"use server"` do not apply.
- All data fetching in `apps/web` uses TanStack Query hooks from `apps/web/src/lib/data-access/`. Never add raw `fetch()` calls to components.
- Form state always uses `useAppForm` from `@ploutizo/ui/components/form` (TanStack Form + Zod). Never use `useState` for form field values.
- `packages/db` uses `@neondatabase/serverless` WebSocket Pool (not postgres.js). Set `neonConfig.webSocketConstructor` before constructing the Pool.
- All API requests from `apps/web` go through `apiFetch` in `apps/web/src/lib/queryClient.ts` — never raw `fetch()`.

## Base Components

- Never modify components in `packages/ui/src/components/reui/` or shadcn-generated files. Override behavior at the usage site via `className` props (Tailwind arbitrary variants), wrapper elements, or exposed component props. Leave a comment explaining any non-obvious override.

## Build & Type Checking

- Never invoke tools directly via `npx` (e.g. `npx tsc`, `npx vitest`, `npx jest`). Always go through the package scripts so the correct flags and config are used.
- Type checking: `pnpm turbo typecheck` (runs `tsc --noEmit` in all packages in dependency order). Never run `npx tsc` from the repo root — it emits JS files.
- Tests: `pnpm test` or `pnpm --filter <package> test`.
- Build: `pnpm turbo build`.

---

## Vercel Skills — When to Apply

Three skills are installed in `.claude/skills/`. Apply them as follows:

### vercel-react-best-practices

**Trigger:** Any task that writes, refactors, or reviews React components or hooks in `apps/web`.

**Action:** Read `.claude/skills/vercel-react-best-practices/SKILL.md` before beginning. Apply all applicable rule categories listed below.

**SPA-applicable rule categories:**
- **Eliminating Waterfalls (`async-*`):** Use `useQueries` for parallel fetches. Avoid `isLoading` early returns that gate other query hooks from mounting. For SPA loading states, fire all queries at the top level and show a combined skeleton.
- **Bundle Size (`bundle-*`):** Avoid external library barrel imports where tree-shaking is uncertain. Internal `data-access/*/index.ts` barrels are fine (Vite bundles them). Use `React.lazy()` + `<Suspense>` for heavy components. Add external heavy libraries to `optimizeDeps.include` in `vite.config.ts`.
- **Server-Side Performance — SPA subset (`server-*`):** Applies to Hono API handlers in `apps/api`. In React components: hoist static data to module scope (`server-hoist-static-io`), avoid module-level mutable state shared across requests (`server-no-shared-module-state`).
- **Client-Side Data Fetching (`client-*`):** TanStack Query already satisfies `client-swr-dedup` — same queryKey deduplicates across all component instances. Keep global `staleTime` non-zero on `QueryClient` (currently 60s). Deduplicate event listeners (`client-event-listeners`).
- **Re-render Optimization (`rerender-*`):** No `setState` during render body — use `useEffect` + `useRef` guard for one-time state initialization. No inline component definitions inside render functions. Use primitive values as effect dependencies. Use `useCallback`/`useMemo` for stable references passed to memoized children.
- **Rendering Performance (`rendering-*`):** Use ternary operators (not `&&`) for conditional rendering when the false branch should render nothing. Suppress known hydration mismatches with `suppressHydrationWarning` on `<html>`.
- **JavaScript Performance (`js-*`):** Use `Map`/`Set` for repeated lookups. Build index maps for O(1) access instead of repeated `.find()` calls in lists.
- **Advanced Patterns (`advanced-*`):** Store event handlers in refs for stable callbacks (`advanced-event-handler-refs`).

---

### vercel-composition-patterns

**Trigger:** Any task that designs or refactors component APIs, adds boolean props to an existing component, or builds a reusable UI component intended for use across multiple pages.

**Action:** Read `.claude/skills/vercel-composition-patterns/SKILL.md` before beginning. Apply all 8 rules.

**All rules apply (this project is on React 19):**
- `architecture-avoid-boolean-props` — Use composition instead of boolean mode switches
- `architecture-compound-components` — Complex components with shared context use compound component pattern
- `state-decouple-implementation` — Provider owns state management; consumers get interface only
- `state-context-interface` — Define `{ state, actions, meta }` interface for context injection
- `state-lift-state` — Move shared state into provider components
- `patterns-explicit-variants` — Create named variant components instead of boolean flags
- `patterns-children-over-render-props` — Prefer `children` composition over `renderX` props
- `react19-no-forwardref` — **React 19 project.** Pass `ref` as a regular prop. Do not use `forwardRef` in any new or refactored custom component in `apps/web`. Shadcn components in `packages/ui` may retain `forwardRef` (third-party generated — do not migrate).

---

### web-design-guidelines

**Trigger:** Any task that adds or modifies UI visible to the user — pages, dialogs, sheets, forms, tables, buttons, navigation, or layouts in `apps/web`.

**Action:**
1. Fetch the latest guidelines: `WebFetch https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
2. Read the target files
3. Apply all rules from the fetched guidelines
4. Output findings in the terse `file:line` format specified by the guidelines

**Key rules (from guidelines as of 2026-04-03 — always fetch fresh for authoritative list):**
- **Forms:** Add `autocomplete` attributes to all text inputs. Use `autocomplete="off"` for custom/non-browser-fillable fields. Use semantic values (`autocomplete="name"`, `autocomplete="organization"`, etc.) for fillable fields.
- **Focus states:** All interactive elements must have visible focus indicators. Never use `outline: none` without a custom focus style.
- **autoFocus:** Only use `autoFocus` when the input is the primary purpose of the current user action (e.g., a search input inside a dialog the user just opened). Add a justification comment.
- **Truncation:** Flex children that render potentially long text must have `min-w-0` applied to prevent overflow.
- **Accessibility:** All icon-only buttons must have `aria-label`. All interactive elements have appropriate ARIA roles where implicit roles are insufficient.
- **Typography:** Use proper Unicode characters: `…` (not `...`), `"` `"` (not `"`), `'` `'` (not `'`).
- **Motion:** Any `animate-*` or CSS transition > 200ms must respect `prefers-reduced-motion`.

<!-- GSD:profile-start -->
## Developer Profile

> Generated by GSD from session_analysis. Run `/gsd-profile-user --refresh` to update.

| Dimension | Rating | Confidence |
|-----------|--------|------------|
| Communication | terse-direct | HIGH |
| Decisions | fast-intuitive | HIGH |
| Explanations | concise | HIGH |
| Debugging | hypothesis-driven | MEDIUM |
| UX Philosophy | design-conscious | HIGH |
| Vendor Choices | opinionated | HIGH |
| Frustrations | instruction-adherence | HIGH |
| Learning | self-directed | MEDIUM |

**Directives:**
- **Communication:** Match this developer's terse communication style. Use short, direct responses. Lead with the action or answer -- do not restate the problem, add preambles, or summarize what you are about to do. Reserve prose for when the developer explicitly asks for explanation.
- **Decisions:** Present a recommended option clearly and move forward. Do not force the developer to choose from an exhaustive list of alternatives unless the trade-offs are genuinely non-obvious. When options must be offered, lead with your recommendation so the developer can accept or redirect quickly.
- **Explanations:** Provide a brief explanation of key decisions alongside code. When fixing a bug, note the root cause in one to two sentences. Do not provide exhaustive walkthroughs or background theory unless asked. Answer 'why' questions directly and concisely without expanding into related topics.
- **Debugging:** When the developer brings a bug with a theory, validate or refute their hypothesis directly before proposing alternatives. Engage with their analysis rather than restarting diagnosis from scratch. For straightforward errors, fix and explain concisely. For complex issues, confirm or correct their root cause hypothesis first.
- **UX Philosophy:** On personal frontend tasks (ploutizo), treat UI correctness as seriously as logic correctness -- preserve design system token conventions, never silently drop columns or rearrange layout. On work/backend projects, function-first is acceptable; flag visual trade-offs but do not block on polish.
- **Vendor Choices:** Do not suggest alternative libraries or frameworks unless explicitly asked. The developer has a committed stack per project. Work within the established tools and patterns. When multiple implementation approaches exist within the stack, ask which the developer prefers rather than introducing a new dependency.
- **Frustrations:** Follow stated constraints precisely. Never modify base components (shadcn/ReUI) -- override at the usage site only. Never change formatting, naming, or structure beyond what was explicitly requested. When a rule has been stated, treat it as permanent for the session and project. If a constraint from a previous interaction applies, apply it proactively without waiting to be reminded.
- **Learning:** Assume the developer has already read the relevant code and docs before asking. Answer specific questions directly without providing foundational background. When explaining a decision, focus on the non-obvious reasoning -- skip what an experienced developer would already know. If they ask a broad question, answer it targeted to the context they provided.
<!-- GSD:profile-end -->
