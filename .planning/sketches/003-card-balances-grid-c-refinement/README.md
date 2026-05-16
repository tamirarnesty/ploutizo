---
sketch: 003
name: card-balances-grid-c-refinement
question: "Within action-menu direction (C), which header treatment and sorting layout best supports accessibility and dense scanning?"
winner: "A (baseline)"
tags: [card-balances, data-grid, sorting, accessibility, header]
---

# Sketch 003: Card balances C refinement

## Design Question

Given variant C as winner, how should we refine the table shell so that:
- Balance and Due are separate sortable columns,
- footer total aligns directly under Balance,
- settle action uses built-in accessible trigger behavior,
- header avoids a weak card-count title?

## How to View

Open `.planning/sketches/003-card-balances-grid-c-refinement/index.html`.

## Variants

- **A: Card Balances + utility chips** — neutral title with contextual chips (sorting + trigger behavior).
- **B: Outstanding by card + total-first** — lead with value framing instead of card count.
- **C: Settlement queue + minimal** — shortest header; relies on table itself for context.

## What to Look For

- Which header feels most informative without adding noise.
- Whether sortable Balance and Due columns improve decision speed.
- Whether click-trigger action menu feels clear, keyboard-friendly, and consistent.
- Whether footer total alignment under Balance reads correctly at a glance.
