# Grid Structure and Density

## Design Decisions
- Use a single account row per card in the main grid; never render full per-member sub-rows by default.
- Keep `Balance` and `Due` as separate sortable columns for faster scan and sort intent.
- Require explicit `Owner` and `Status` values in every row; `Due` is blank when missing (no placeholder dash).
- Align footer totals under the `Balance` column using table foot colspans, not a detached summary line.
- Use ReUI data-grid shell patterns (header, table, footer totals, pagination) instead of custom grid chrome.

## CSS Patterns
- Dense row spacing: 9-10px vertical cell padding with compact typography and tabular numbers for money.
- Sticky visual hierarchy: muted uppercase headers, stronger data text, and low-contrast row hover.
- Split visualization: 8px segmented bar with member badges below, kept inside the same split cell.

## HTML Structures
- Table structure: `Card | Owner | Balance | Due | Status | Split by member | Action`.
- Footer structure: label cell spans first two columns, total amount in `Balance` column cell.
- Split cell structure: segmented bar + member badges row in one container.

## What to Avoid
- Expand-all per-member detail rows as default (causes immediate density collapse at 6+ members).
- Combined `Balance · Due` column (slower sorting/scan and less predictable alignment).
- Empty owner/status placeholders when data can be derived or computed.

## Origin
Synthesized from sketches: 002, 003
Source files available in:
- `sources/002-card-balances-grid-density/`
- `sources/003-card-balances-grid-c-refinement/`
