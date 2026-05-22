# Status, Brand, and Icon Language

## Design Decisions
- Status uses icon + text (not icon-only) in a semantic badge container.
- Brand treatment in the Card subtitle favors institution + last four (`Institution •••• 1234`), with optional brand marker as secondary visual aid.
- Icon usage is purposeful: settle action and status affordances get icons, but textual clarity remains primary.
- Keep iconography consistent in stroke/weight across status and action surfaces.

## CSS Patterns
- Status badges: subtle tinted backgrounds with semantic foreground/border colors.
- Icon + text alignment: tight inline-flex spacing with compact label text.
- Card metadata line: muted, single-line subtitle under card name.

## HTML Structures
- Status cell: badge element containing status icon and label text.
- Card cell: primary name line, metadata line with institution and masked digits.
- Action cell: icon+text button opening menu with member amount choices.

## What to Avoid
- Icon-only settle/status controls as the default (discoverability suffers).
- Overly loud brand badges that compete with account name and amount hierarchy.
- Mixing icon styles from multiple visual systems in the same table.

## Origin
Synthesized from sketches: 004, 006
Source files available in:
- `sources/004-card-balances-final-icons/`
- `sources/006-card-balances-synthesis-tooltip/`
