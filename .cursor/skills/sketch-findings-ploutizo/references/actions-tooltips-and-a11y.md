# Actions, Tooltips, and Accessibility

## Design Decisions
- Settle flow uses a click-trigger `DropdownMenu` in the Action column for member selection.
- The Settle trigger uses icon + text, not icon-only, for faster comprehension and accessibility.
- Member amount tooltip lives on member badges (winner), with `delay={500}` set on each tooltip root.
- Keep tooltip interaction local and component-scoped; avoid relying on global provider behavior for this case.

## CSS Patterns
- Action trigger style: compact solid button with clear contrast and consistent hit area.
- Badge tooltip targets: interactive chip-like elements with visible focus styles.
- Menu rows: name on left, amount on right, consistent vertical rhythm.

## HTML Structures
- Action structure: trigger button (`aria-haspopup`, `aria-expanded`) + menu list of actionable members.
- Tooltip structure: trigger-as-child around badge-level interactive element.
- Keyboard support expectations: open/close via keyboard, escape closes menu/tooltip overlays.

## What to Avoid
- Row-hover-only settle affordances (not discoverable enough and too broad a target).
- Tooltip only on tiny split segments as primary strategy (small hit target, weaker keyboard ergonomics).
- Custom hover-driven settle menus that bypass built-in menu accessibility semantics.

## Origin
Synthesized from sketches: 002, 003, 006
Source files available in:
- `sources/002-card-balances-grid-density/`
- `sources/003-card-balances-grid-c-refinement/`
- `sources/006-card-balances-synthesis-tooltip/`
