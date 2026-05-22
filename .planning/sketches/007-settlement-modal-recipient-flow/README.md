---
sketch: 007
name: settlement-modal-recipient-flow
question: "How should settlement modal prioritize prefilled recipient selection from Card Balances while keeping amount/source/date overrideable?"
winner: "Synthesis (D): C + app primitives"
tags: [settlement, modal, recipient-first, dashboard]
---

# Sketch 007: Settlement Modal Recipient Flow

## Design Question
What interaction pattern makes "choose who to settle with" feel automatic and low-friction while preserving manual override controls for amount, paid-from account, date, and notes?

## How to View
open .planning/sketches/007-settlement-modal-recipient-flow/index.html

## Variants
- **A: Stacked cards** - closest to the target mockup, with large recipient cards and immediate visual confidence on the selected row.
- **B: Split choose + preview** - left panel is pure selection, right panel amplifies chosen recipient and exact due amount.
- **C: Compact transaction queue** - dense row-based queue with "Use due" actions for fast keyboard/mouse transactional flow.
- **Synthesis: C + app primitives** - compact queue with choice-card radio selection, `$` amount addon, account select, and popover calendar datepicker.

## What to Look For
- Which variant makes recipient selection feel the fastest with prefill already active
- Whether amount/source/date overrides still feel obvious without stealing attention
- Whether the synthesis variant feels closest to production primitives used elsewhere in the app
- Which footer action hierarchy best supports confident settle completion
