---
sketch: 002
name: card-balances-grid-density
question: "How should Card Balances stay compact as cards and members grow, while keeping owner/status required and settle member-specific?"
winner: "C"
tags: [card-balances, data-grid, density, reui]
---

# Sketch 002: Card balances grid density

## Design Question

How should the Card Balances grid reduce crowding as cards/members scale while enforcing:
- settle targeting at the member level (not full-row hover),
- owner always visible with avatar + name pattern,
- status always present,
- due date shown when present and blank when missing?

## How to View

Open `.planning/sketches/002-card-balances-grid-density/index.html`.

## Variants

- **A: Inline member actions** — Keep split visibility in-row; each member chip reveals its own settle affordance only when that member has a positive balance.
- **B: Expand-on-demand details** — Default row stays compact; member-level settle actions move into a details panel that opens per card.
- **C: Action menu by member** — Keep split summary compact; Action cell opens a per-member menu containing only members with balances.

## What to Look For

- Whether settle intent feels precise and discoverable without row-level hover behavior.
- Which variant best controls vertical density when moving from 2 cards to 8 cards.
- Whether owner and status remain glanceable in every row.
- Whether due-date blank state (empty cell, no placeholder) reads cleanly.
- Which pattern maps most naturally to ReUI data-grid composition (`DataGridTable` footer + `DataGridPagination` shell).
