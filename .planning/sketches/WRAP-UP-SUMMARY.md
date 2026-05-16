# Sketch Wrap-Up Summary

**Date:** 2026-05-15  
**Sketches processed:** 6  
**Design areas:** Grid structure & density; Actions & accessibility; Header subtitle legend; Status/brand icon language  
**Skill output:** `./.cursor/skills/sketch-findings-ploutizo/`

## Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 002 | card-balances-grid-density | C | Grid structure & density |
| 003 | card-balances-grid-c-refinement | A (baseline) | Grid structure & density |
| 004 | card-balances-final-icons | C (baseline) | Status/brand icon language |
| 005 | card-balances-subtitle-legend | Synthesis → sketch 006 | Header subtitle legend |
| 006 | card-balances-synthesis-tooltip | A (tooltip delay 500ms) | Actions & accessibility |

## Excluded Sketches
| # | Name | Reason |
|---|------|--------|
| 001 | settlement-summary-pane | No winner selected; separate settlement pane exploration from card-balances flow |

## Design Direction
Card Balances converged on a compact ReUI data-grid composition with a single row per card, separate sortable `Balance` + `Due` columns, and footer totals aligned under `Balance`. The final interaction model uses a click-trigger `DropdownMenu` for member settlement and badge-level tooltips (500ms delay) for per-member amount detail.

## Key Decisions
- Keep required row information always visible: owner + status always rendered, due blank when absent.
- Preserve split context in-row via segmented bar + member badges (no default expanded detail rows).
- Use `Card Balances` title with compact top-3 subtitle tokens and overflow (`+N more`), color-matched to split badges.
- Keep status and settle affordances icon+text for accessibility and scan clarity.
- Card metadata line uses institution + masked last four (`Institution •••• 1234`).
