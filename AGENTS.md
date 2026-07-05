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

Project guidance is split across `docs/`. Read the linked file when a task matches its scope.

| Document                                                             | Purpose                                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [docs/stack-and-conventions.md](docs/stack-and-conventions.md)       | Stack, data/forms/persistence constraints, base UI components, build and test commands    |
| [docs/overlay-close-animations.md](docs/overlay-close-animations.md) | Dialog, alert dialog, and sheet open/close state so exit animations are not cut off       |
| [docs/development-environment.md](docs/development-environment.md)   | Dev servers, env secrets, Turborepo quality commands, Clerk webhooks and test credentials |

Architecture decision records: [docs/adr/](docs/adr/).
