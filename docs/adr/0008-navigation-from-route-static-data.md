---
status: accepted
---

# Navigation from route staticData

App navigation (sidebar, command palette, section tabs) is derived from TanStack Router's route tree via per-route `staticData.nav`, not a central registry.

## Context

Navigation metadata previously lived in `app-nav.ts` — a parallel source of truth beside the route tree. Labels, keywords, and hierarchy were duplicated or manually synchronized whenever routes changed. PLO-99 deduplicated command palette entries from the sidebar registry, but the registry itself remained the bottleneck for adding navigable routes.

TanStack Router already supports synchronous route metadata through `staticData` (we use it for `mainContentLayout`). The library's community guidance for app-wide navigation is the same: declare metadata on routes, walk `router.flatRoutes` to collect it.

## Decision

### Route tree is the source of truth

Each navigable route declares a `staticData.nav` block co-located with its route definition. A `collectNav(router)` function walks `flatRoutes` and produces sidebar trees, footer items, and command palette groups. Delete the central registry.

### Sidebar tree from route hierarchy

Child routes with `nav.sidebar: true` (default) nest under their parent when the parent also has `nav`. This gives Import → Import History automatically from file structure. Routes with `nav.sidebar: false` are excluded from the sidebar but remain searchable in the command palette and available to section tab collectors — enabling settings children to live in layout tabs instead of sidebar children.

### Icons stay outside staticData

Lucide components are not serializable. A path-keyed `nav-icons.ts` map (`Record<AppNavRoute, LucideIcon>`) provides compile-time exhaustiveness; `resolveNavIcon()` throws at runtime if a route with `nav` lacks a mapping. No silent fallback.

### Settings: sidebar link + layout tabs

Settings is a single footer sidebar link (active on any `/settings/*` path). Child settings routes render as Line-variant URL-navigating tabs in the settings layout via `collectSectionNav`. Command palette still lists all settings destinations in the Settings group.

### Type augmentation consolidated

All `StaticDataRouteOption` fields (`mainContentLayout`, `nav`) augment in one `route-static-data.d.ts` rather than scattered across layout and navigation modules.

## Considered options

| Option | Why not |
|---|---|
| Central registry (`app-nav.ts`) | Requires manual sync with route tree; adding a route means editing multiple files |
| `parentRouteId` in staticData | Route file hierarchy already matches nav shape for remaining sidebar groups; explicit IDs add fields without benefit |
| Icons in staticData as string keys | Extra indirection layer; path-keyed map is simpler and type-checked |
| `linkOptions` arrays in layout files | Duplicates labels already on route staticData; collector + Link/activeProps achieves the same tab pattern |
| Import route folder with passthrough layout | Unnecessary for a single leaf route; dot notation matches dashboard/accounts |

## Consequences

- Adding a navigable route: route file with `staticData.nav` + one line in `nav-icons.ts`
- Settings UX shifts from sidebar submenu to in-layout tabs
- `collectNav` and `collectSectionNav` are the only nav assembly points; tests target collectors, not registries
