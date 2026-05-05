---
slug: sidebar-hydration-mismatch
status: resolved
trigger: "Hydration mismatch in sidebar: SSR renders with defaultOpen=true but client reads cookie and gets false"
created: 2026-05-05
updated: 2026-05-05
---

## Symptoms

- **Expected:** Sidebar state persists across page loads via cookie; no hydration warnings
- **Actual:** React hydration mismatch — server renders sidebar as expanded (data-state=expanded), client sees cookie value false and renders collapsed (data-state=collapsed)
- **Error:** "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" — `data-state` collapsed vs expanded, `data-collapsible` icon vs empty string
- **Timeline:** Introduced when `getSidebarDefaultOpen()` was given an SSR guard (`if (typeof document === 'undefined') return true`) to fix a prior `document is not defined` crash during SSR
- **Reproduction:** Load the app with a `sidebar_state=false` cookie set; sidebar hydration mismatch fires on every page load

## Current Focus

- hypothesis: "getSidebarDefaultOpen() returns true on SSR but reads cookie on client, causing mismatch in useState(defaultOpen) inside SidebarProvider"
- test: ""
- expecting: ""
- next_action: "fix applied"
- reasoning_checkpoint: "SidebarProvider has no built-in cookie reading — it writes cookie on toggle but reads defaultOpen from prop once into useState. SSR returns true, client returns false. Root cause confirmed."
- tdd_checkpoint: ""

## Evidence

- timestamp: 2026-05-05T00:00:00Z
  file: apps/web/src/routes/_layout.tsx
  finding: getSidebarDefaultOpen() returns true on server (typeof document === undefined guard) but reads sidebar_state cookie on client. Passed as defaultOpen prop to SidebarProvider which calls useState(defaultOpen) — initial value differs between SSR and client.

- timestamp: 2026-05-05T00:00:00Z
  file: packages/ui/src/components/sidebar.tsx:70
  finding: SidebarProvider does const [_open, _setOpen] = React.useState(defaultOpen) — no cookie reading, only cookie writing. So there is no built-in hydration handling. The caller is fully responsible for providing a consistent defaultOpen.

## Eliminated

- SidebarProvider having built-in cookie reading that could handle this transparently — it does not.

## Resolution

- root_cause: "getSidebarDefaultOpen() returns true during SSR (typeof document guard) but reads cookie on client; SidebarProvider's useState(defaultOpen) captures the mismatched values, causing React hydration mismatch when sidebar_state=false cookie is set."
- fix: "Switched LayoutShell to controlled mode: useState(true) matches SSR, useEffect after mount reads cookie and calls setOpen to sync. SidebarProvider now receives open/onOpenChange instead of defaultOpen. No hydration mismatch."
- verification: "pnpm turbo typecheck — all 6 tasks passed (web:typecheck cache miss, executed clean)"
- files_changed: "apps/web/src/routes/_layout.tsx"
