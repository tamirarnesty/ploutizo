<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Ploutizo — Agent Instructions

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and
  indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own
  implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.

Project guidance is split across `docs/`. Read the linked file when a task matches its scope.

| Document                                                             | Purpose                                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [docs/stack-and-conventions.md](docs/stack-and-conventions.md)       | Stack, data/forms/persistence constraints, base UI components, build and test commands    |
| [docs/overlay-close-animations.md](docs/overlay-close-animations.md) | Dialog, alert dialog, and sheet open/close state so exit animations are not cut off       |
| [docs/development-environment.md](docs/development-environment.md)   | Dev servers, env secrets, Turborepo quality commands, Clerk webhooks and test credentials |

Architecture decision records: [docs/adr/](docs/adr/).

## Agent skills

### Issue tracker

Issues are tracked in Linear. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Uses a multi-context layout. See `docs/agents/domain.md`.

## Before commit/push

From the **workspace root**, run lint and formatting across the whole monorepo — not just the package you edited:

```bash
pnpm turbo format        # Prettier write + eslint --fix (all packages)
pnpm turbo format:check  # verify formatting
pnpm turbo lint          # ESLint (all packages)
```

Fix any failures before committing or pushing. Scoped checks (e.g. `pnpm --filter web lint`) are fine while iterating; the root `pnpm turbo …` pass is required before push.
