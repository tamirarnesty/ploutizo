# Engineering Standards

## Tenant-scoped foreign keys

Use database constraints to enforce tenancy whenever an org-owned table
references another org-owned table.

- A child table with `org_id` must reference an org-owned parent with a composite
  foreign key: `(parent_id, org_id) → parent(id, org_id)`.
- The parent must expose a unique `(id, org_id)` key for that reference.
- Do not add a parallel single-column foreign key on `parent_id`; the composite
  constraint already enforces existence and tenant ownership.
- Keep the child table's standalone `org_id → orgs(id)` foreign key.
- Add a supporting index only when it is not already covered by the leftmost
  columns of an existing unique or non-unique index.

For composite foreign keys whose referenced ID is nullable, use a
column-specific delete action such as `ON DELETE SET NULL (parent_id)`. Never
use bare `ON DELETE SET NULL`, which would also attempt to null the required
`org_id` column.

When a child table does not carry `org_id`, do not add it solely to force a
composite foreign key without an explicit schema-design decision. Use
application-level ownership checks until that relationship is migrated
deliberately.

For existing deployed tables, introduce this pattern through a forward-only
migration; do not rewrite an already-applied migration.

## UI library composition and customization

`@ploutizo/ui` (shadcn, ReUI, and thin wrappers over libraries such as Recharts)
is the default toolset for product UI. **Compose** exported primitives and their
documented capabilities; do not rebuild the same surfaces by hand.

This applies in **`apps/web`** and in **`packages/ui`** whenever you build or
change UI that imports from `@ploutizo/ui` — feature components, shared app
widgets, and higher-level primitives inside the UI package (for example
`date-range-picker`, `command`, ReUI filters).

### shadcn composition (normative)

shadcn-derived exports in `@ploutizo/ui` follow the **Composition** trees and
subcomponents documented on [shadcn/ui](https://ui.shadcn.com/docs/components).
Before you wire a primitive, open its component page (and types in
`packages/ui`) and match that structure — root, children, slots, and documented
`data-slot` / `asChild` / `render` patterns.

| Rule | Meaning |
| ---- | ------- |
| **Use the documented tree** | Put the parts the docs name inside the root they belong to (`Dialog` → `DialogContent` → `DialogHeader`; `InputGroup` → `InputGroupInput` + `InputGroupAddon`; `Field` → `FieldLabel` + control). |
| **Use group subcomponents, not siblings** | Do not swap in a standalone primitive where the registry exposes a group-specific one (`Input` + absolutely positioned icon instead of `InputGroup` + `InputGroupInput` + `InputGroupAddon`). |
| **Do not reimplement the shell** | Borders, focus rings, disabled states, roles, and spacing that subcomponents apply stay on those subcomponents — not duplicated on wrapper `div`s or raw HTML. |
| **Respect document order when docs require it** | Some groups (for example input-group addons and focus) depend on DOM order and `align`; follow the page, do not reorder for convenience. |
| **ReUI and forks** | ReUI blocks under `packages/ui/src/components/reui/` and Ploutizo forks still compose underlying shadcn primitives the same way; use [ReUI](https://reui.io) / inline APIs when the surface is ReUI-specific. |

ReUI-only or engine-wrapped surfaces (for example `ChartContainer` over
Recharts, `DataGrid`) follow that wrapper’s documented composition the same way
— read **its** page and types, then compose; do not bypass to the underlying
engine when a wrapper exists.

General workflow:

1. **Find the library entry point** — component, hook, or config type from
   `@ploutizo/ui` (shadcn component page, ReUI API, or underlying library docs
   when needed).
2. **Match documented composition** — slots, subcomponents, and props the
   registry already exposes (`ChartTooltipContent`, `InputGroupInput`, `Field`,
   `DataGrid` props, form field APIs, and so on).
3. **Customize through the narrowest supported extension** — prefer targeted
   props over replacing whole UI trees.
4. **Extend `packages/ui` only when the gap is product-agnostic** — a typed prop
   or behavior any feature might need, with no domain copy or money/date rules
   baked in.
5. **Keep domain in the app** — formatters, labels, validation messages, and
   business rules live in `apps/web` or shared domain packages (`@ploutizo/utils`,
   types, validators), wired in at the usage site.

### Do not hand-roll what the library already provides

- Do not duplicate layout, accessibility, or styling that a composed primitive
  already implements (tooltips, legends, dialogs, tables, empty states, input
  group chrome).
- Do not bypass the library to talk to the underlying engine when a wrapper
  exists (for example raw Recharts tooltip markup next to `ChartContainer`).
- If the docs place a subpart in a specific tree (legend inside the chart,
  tooltip `content` component, addon after `InputGroupInput`), follow that
  structure. Siblings or parallel DOM often break sizing, focus, or theming.

### How to customize (in order)

| Step | When | Examples |
| ---- | ---- | -------- |
| **Usage-site props** | Default looks need small tweaks | `className`, `labelFormatter`, `tickFormatter`, `variant`, `nameKey` |
| **Shared config objects** | Repeated labels, colors, keys | `chartConfig`, column defs, theme tokens (`var(--color-*)`) |
| **Library extension points** | One field or region changes | `ChartTooltipContent` `valueFormatter` (value text only) or `indicatorColor` (dot colour only); not the full-row `formatter` unless the whole row is custom |
| **Fork `packages/ui`** | No hook exists; any feature could use it | New optional prop on a primitive; document under **Base components** in [stack-and-conventions.md](stack-and-conventions.md) |
| **New app component** | Orchestration only | Wire data fetching + library pieces; no reimplemented primitive UI |

Read each component’s **types and upstream docs** before choosing a prop. Many
“custom UI” needs are satisfied by a formatter or key the library already
documents (shadcn chart tooltips: `labelKey`, `nameKey`, `labelFormatter`,
`indicator`, `hideLabel`).

**Avoid the wrong extension:**

- Props that **replace an entire subtree** when you only need one part (for
  example `formatter` on `ChartTooltipContent` for currency — use
  `valueFormatter` instead).
- **Pre-formatted domain values in data** passed to scales or geometry (strings
  instead of numbers) — format at **display edges** (axis, tooltip, cells) so
  math and library behavior stay correct.

Use the **same domain formatter** everywhere a value is shown (axis + tooltip +
grid) so the product stays consistent.

### Charts

Charts apply the same shadcn composition rules; the table below is **product**
guidance on top of the chart primitives. Build with shadcn
Chart primitives in `@ploutizo/ui` over Recharts (`ChartContainer`,
`ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`).
See [shadcn chart docs](https://ui.shadcn.com/docs/components/chart).

| Concern | Use the library / engine |
| ------- | ------------------------ |
| Tooltip shell, indicators, layout | `ChartTooltip` + `ChartTooltipContent` |
| Legend | `ChartLegend` + `ChartLegendContent` inside the chart |
| Series labels and colors | `chartConfig`; keys match `dataKey` / `name`; colors `var(--color-<key>)` |
| Tooltip date header | `labelFormatter` |
| Tooltip amounts | `valueFormatter` (Ploutizo fork on `ChartTooltipContent`) |
| Prior period | The current series' colour, faded (`fadedColour` in `dashboardChartColour.ts`), plus dashed (`6 4`) for lines; legend and tooltip take it from `chartConfig` |
| In-progress buckets | The same fade, dotted (`0 5`, round caps) so it never reads as prior; one `FADED_OPACITY` for every de-emphasised mark |
| Per-point colours (`<Cell>`) | Tooltip dots via `indicatorColor` (Ploutizo fork on `ChartTooltipContent`): Recharts passes the tooltip each series' own colour, never its cells'. The legend then explains the treatment (solid vs faded neutral), not a hue |
| Axis amounts | `tickFormatter` on `YAxis` / `XAxis` |
| Missing series in tooltip | Recharts `filterNull` (default); `null` in data, not `0` |
| Gaps in lines | Do not use `connectNulls` when absence is meaningful |
| Loading / refetch | Flexible chart slot (`min-h-56 flex-1`, chart at `h-full`); `Spinner` overlay (no skeleton block); empty state only after fetch settles; `placeholderData` on queries when keys change; reference: `DashboardOverviewMetricCard` |

```tsx
// Compose primitives; format at edges; keep data numeric
<ChartTooltip
  content={
    <ChartTooltipContent
      labelFormatter={formatBucketDateFromPayload}
      valueFormatter={(cents) => formatCurrency(cents)}
    />
  }
/>
<YAxis tickFormatter={(v) => formatCurrency(v)} />
```

`formatCurrency` and date helpers stay in app/utils — not in `packages/ui`.
