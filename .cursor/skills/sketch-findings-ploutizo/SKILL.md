---
name: sketch-findings-ploutizo
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-load during dashboard Card Balances and settlement modal UI implementation on ploutizo.
---

<context>
## Project: ploutizo

Dashboard settlement UX should stay low-friction and transactional while preserving clarity as account/member complexity grows. The chosen direction uses compact, sortable Card Balances rows with explicit settlement actions, and a recipient-first settlement modal that is prefilled from Card Balances but easy to override.

Reference points used during sketching included existing dashboard settlement surfaces, ReUI data-grid composition examples, and premium banking/payment modal UI patterns.

Sketch sessions wrapped: 2026-05-15, 2026-05-18
</context>

<design_direction>
## Overall Direction

Build Card Balances as a compact, sortable data grid with a single row per card and explicit settle actions. Keep split visualization inside one cell (segmented bar + badges), use icon+text semantics for status and actions, and preserve institution/last4 metadata treatment. For settlement entry, use a compact recipient-first modal with choice-card radio selection, app-consistent amount/account/date primitives, and prefilled values from Card Balances that remain manually overrideable.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Grid Structure & Density | references/grid-structure-and-density.md | One-row-per-card layout with separate sortable Balance/Due and Balance-aligned footer totals |
| Actions & Accessibility | references/actions-tooltips-and-a11y.md | Use DropdownMenu for settle selection and badge-level tooltips with per-instance delay |
| Header & Subtitle Legend | references/header-and-subtitle-legend.md | Compact top-3 token subtitle with separators and color mapping, no verbose prefix |
| Status, Brand & Icons | references/status-brand-and-icon-language.md | Keep icon+text semantics for status/action and institution + last4 card metadata |
| Settlement Modal Flow & Form Primitives | references/settlement-modal-flow-and-form-primitives.md | Compact recipient-first modal using choice-card radios and app-consistent amount/account/date inputs |

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
- 007-settlement-modal-recipient-flow

## Excluded

- 001-settlement-summary-pane (no winner selected; separate settlement pane exploration)
</metadata>
