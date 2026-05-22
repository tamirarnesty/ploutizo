---
sketch: 004
name: card-balances-final-icons
question: "For the final C-based grid, which icon strategy (settle/status/brand) gives the best clarity without accessibility regressions?"
winner: "C (baseline)"
tags: [card-balances, final, icons, accessibility, sorting, reui]
---

# Sketch 004: Card balances final icons

## Design Question

Using the C direction as baseline, which icon treatment should we ship for:
- settle action trigger,
- status visualization,
- credit card brand representation,
while keeping sortable columns, split member badges, click-menu accessibility, and balance-aligned footer totals?

## How to View

Open `.planning/sketches/004-card-balances-final-icons/index.html`.

## Variants

- **A: Text + icon hybrid** — status icon + text, settle icon + text, classic brand pill.
- **B: Icon-forward compact** — icon-only settle trigger and icon-heavy status affordance.
- **C: Brand-badge emphasis** — keep readability, but make brand cues strongest visually.

## What to Look For

- Which icon style remains clear at scan speed.
- Whether icon-only controls remain understandable and keyboard-safe.
- Whether brand marker improves card recognition without adding clutter.
- Whether subtitle member totals and split badges together feel useful (not repetitive).
