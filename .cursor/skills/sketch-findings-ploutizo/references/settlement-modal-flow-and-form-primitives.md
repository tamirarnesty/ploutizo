# Settlement Modal Flow and Form Primitives

## Design Decisions
- Settlement modal prioritizes recipient choice first, with a compact queue/choice-card layout as the primary interaction.
- Selected recipient pre-fills the amount from Card Balances, but amount stays manually editable.
- Recipient selection uses a choice-card radio pattern (full-row clickable cards) instead of dense inline controls.
- Amount input uses a leading `$` addon to match other amount fields in the app.
- Paid-from field uses the existing account select pattern already used elsewhere in dashboard forms.
- Date uses a popover-triggered calendar datepicker pattern, not a plain text/date input.
- Modal header identity follows card-cell treatment: card name on first line, `Institution •••• last4` on second line.
- Labels use sentence case (not all caps) to align with the billing-card style reference.

## CSS Patterns
- Compact recipient cards with clear selected state (`border + surface tint`) and tabular money alignment.
- Form field rhythm uses a two-column row for `Paid from` + `Date` and a full-width amount row above.
- Addon amount field uses an inline-start token (`$`) with left padding on the text input.
- Datepicker and account select menus use shared popover styling: rounded surface, subtle border, dense list/grid options.

## HTML Structures
- Recipient group structure:
  - `radiogroup` wrapper
  - repeated label-backed choice cards with hidden native radio input
  - content region (avatar + identity + amount) and visual radio indicator
- Amount structure:
  - `amount-group` wrapper
  - addon span + input control
- Date structure:
  - trigger button + popover panel
  - grid of day pills for selection

## What to Avoid
- Per-recipient remove `x` controls inside primary radio choice cards (creates accidental destructive affordance).
- All-caps labels for section/form headings in this modal style direction.
- A top prefill banner that competes with recipient selection.
- Lock-amount toggle sections that add cognitive load for a transactional quick flow.

## Origin
Synthesized from sketches: 007
Source files available in:
- `sources/007-settlement-modal-recipient-flow/`
