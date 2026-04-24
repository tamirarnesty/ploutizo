---
title: Implement <Text> typography component in packages/ui
date: 2026-04-14
priority: high
---

## Task

Build a `<Text>` component in `packages/ui` to serve as the single typography primitive across the app.

## Design

- `as` prop — controls DOM element (defaults to `p`). Accepts `h1`–`h6`, `p`, `span`, `div`, `label`
- `variant` prop — controls visual preset (defaults to `body`). Presets:
  - `h1`, `h2`, `h3` — heading sizes
  - `body` — default paragraph text
  - `body-sm` — smaller body text
  - `caption` — small supporting text
  - `label` — form label sizing
- `className` merged last via `cn` util — for color, weight, italic, and one-off overrides
- `as` and `variant` are fully decoupled — `<Text as="span" variant="h2">` is valid

## Notes

- Base UI and Radix primitives have no typography component — build from scratch
- Lives alongside shadcn components in `packages/ui/src/components/`
- Export from `packages/ui` index
- After implementation, a refactor sweep phase will replace all raw HTML typography elements across the codebase
