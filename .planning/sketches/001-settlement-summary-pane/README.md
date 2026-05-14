---
sketch: 001
name: settlement-summary-pane
question: "How can per-member settlement stay glanceable without repeating amount, cards, or owed?"
winner: null
tags: [settlement, dashboard, density]
---

# Sketch 001: Settlement summary pane

## Design Question

How should the dashboard settlement summary show per-member exposure with color and card scope, without repeating the dollar amount, card count, or “owed” wording in multiple places?

## How to View

Open `.planning/sketches/001-settlement-summary-pane/index.html` in a browser.

## Variants

- **A: Status rail** — Left accent encodes due / credit / clear; amount appears once on the right; card count is a muted caption only when non-zero.
- **B: Signal chips** — Row tint plus a single status chip (Due / Credit / Clear); amount once on the right; card count stays secondary.
- **C: Card segments** — Mini segment bar under the name shows active cards; amount once on the right; legend explains color without repeating labels per row.

## What to Look For

- Whether the amount reads once per row without feeling incomplete.
- Whether color carries direction without an extra “owed” line.
- Whether card scope reads as metadata, not a second headline.
- Use **Cycle state** for mixed balances, multi-card members, credits, and the no-cards household.
