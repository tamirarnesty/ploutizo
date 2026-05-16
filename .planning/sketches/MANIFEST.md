# Sketch Manifest

## Design Direction

Settlement summary should read at a glance: one primary number per member, color for direction (owe / credit / clear), and card scope as secondary metadata only — never repeat the dollar amount, card count, or “owed” wording in multiple places.

## Reference Points

- Current dashboard Settlement pane (`SettlementSummaryPane.tsx`)
- Ploutizo dark card shell (serif headings, muted captions, emerald success for credits)

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | settlement-summary-pane | How can per-member settlement stay glanceable without repeating amount, cards, or owed? | null | settlement, dashboard, density |
| 002 | card-balances-grid-density | How should Card Balances stay compact as cards/members grow, while keeping owner/status required and settle member-specific? | C | card-balances, data-grid, density, reui |
| 003 | card-balances-grid-c-refinement | Within action-menu direction (C), which header treatment and sorting layout best supports accessibility and dense scanning? | A (baseline) | card-balances, data-grid, sorting, accessibility, header |
| 004 | card-balances-final-icons | For the final C-based grid, which icon strategy (settle/status/brand) gives the best clarity without accessibility regressions? | C (baseline) | card-balances, final, icons, accessibility, sorting, reui |
| 005 | card-balances-subtitle-legend | What subtitle display and icon treatment should we use for the final Card Balances header while preserving C baseline behavior? | Synthesis → sketch 006 | card-balances, subtitle, legend, icons, final |
| 006 | card-balances-synthesis-tooltip | In the final synthesized card balances layout, where should member amount tooltips live: badges, segments, or both? | A (tooltip delay 500ms) | card-balances, synthesis, tooltip, accessibility, final |
