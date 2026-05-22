# Header and Subtitle Legend

## Design Decisions
- Header title remains plain: `Card Balances`.
- Subtitle is compact token text with separators (Separator-style dividers), not a verbose sentence.
- Subtitle content shows top 3 members by outstanding amount plus overflow (`+N more`).
- Subtitle member colors match the same color slots used in split-by-member badges/segments.

## CSS Patterns
- Subtitle token line uses muted text with small colored dots and low-contrast separators.
- Keep subtitle as a single compact metadata row; do not promote to large badge blocks unless needed.
- Preserve visual weight for row data by keeping header metadata lighter than table body.

## HTML Structures
- Header: title + compact token subtitle on the left; utility actions on the right.
- Subtitle token: `dot + amount + member`, repeated and separated by thin vertical separators.
- Overflow token appended as last token when member count exceeds three.

## What to Avoid
- “Card count as title” framing (e.g. `5 cards`) as the primary headline.
- Repeating explanatory prefixes in subtitle (e.g. “Outstanding per member”).
- Full-width badge strips when compact token text already communicates totals clearly.

## Origin
Synthesized from sketches: 005, 006
Source files available in:
- `sources/005-card-balances-subtitle-legend/`
- `sources/006-card-balances-synthesis-tooltip/`
