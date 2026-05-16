---
name: sketch-findings-ploutizo
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-load during Card Balances UI implementation on ploutizo.
---

<context>
## Project: ploutizo

Card Balances should stay dense and sortable as card/member counts grow, while preserving clarity for owner, due/status signals, and member-level settlement actions. The chosen direction favors ReUI data-grid composition, compact metadata, and explicit accessibility-first interactions.

Reference points used during sketching included existing dashboard settlement surfaces and ReUI data-grid composition examples.

Sketch sessions wrapped: 2026-05-15
</context>

<design_direction>
## Overall Direction

Build Card Balances as a compact, sortable data grid with a single row per card. Keep split visualization inside one cell (segmented bar + badges), and drive settlement through an explicit Action menu (icon+text trigger). Use `Card Balances` as stable title with a compact top-3 subtitle legend (color-matched tokens + separators + overflow). Keep status icon+text labels and institution/last4 card metadata. Tooltip details live on member badges with a 500ms delay per tooltip instance.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Grid Structure & Density | references/grid-structure-and-density.md | One-row-per-card layout with separate sortable Balance/Due and Balance-aligned footer totals |
| Actions & Accessibility | references/actions-tooltips-and-a11y.md | Use DropdownMenu for settle selection and badge-level tooltips with per-instance delay |
| Header & Subtitle Legend | references/header-and-subtitle-legend.md | Compact top-3 token subtitle with separators and color mapping, no verbose prefix |
| Status, Brand & Icons | references/status-brand-and-icon-language.md | Keep icon+text semantics for status/action and institution + last4 card metadata |

## Theme

The winning theme file is at `sources/themes/default.css`.

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Sketches

- 002-card-balances-grid-density
- 003-card-balances-grid-c-refinement
- 004-card-balances-final-icons
- 005-card-balances-subtitle-legend
- 006-card-balances-synthesis-tooltip

## Excluded

- 001-settlement-summary-pane (no winner selected; separate settlement pane exploration)
</metadata>
