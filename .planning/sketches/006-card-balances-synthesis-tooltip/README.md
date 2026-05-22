---
sketch: 006
name: card-balances-synthesis-tooltip
question: "In the final synthesized card balances layout, where should member amount tooltips live: badges, segments, or both?"
winner: "A (tooltip delay 500ms)"
tags: [card-balances, synthesis, tooltip, accessibility, final]
---

# Sketch 006: Card balances synthesis tooltip

## Design Question

After synthesizing your chosen direction (A card cell + C subtitle/action/split/status), what is the best tooltip target for per-member amount details:
- member badges,
- split bar segments,
- or a hybrid approach?

## How to View

Open `.planning/sketches/006-card-balances-synthesis-tooltip/index.html`.

## Variants

- **A: Tooltip on member badges** — badge is the primary focus/hover target.
- **B: Tooltip on split segments** — segmented bar slices carry the detail tooltip.
- **C: Hybrid** — badges and segments both expose tooltips.

## What to Look For

- Which target is easiest to discover in dense rows.
- Which target is easiest to focus with keyboard.
- Which approach feels least noisy while still informative.
