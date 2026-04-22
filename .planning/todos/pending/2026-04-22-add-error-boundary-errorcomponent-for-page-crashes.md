---
created: 2026-04-22T00:00:00Z
title: Add error boundary/errorComponent to handle page crashes
area: ui
files:
  - apps/web/src/routes/__root.tsx
---

## Problem

Page-level crashes (unhandled render errors, failed data fetches bubbling up) have no graceful recovery path. Users hit a blank screen with no way to recover. TanStack Start exposes `errorComponent` on route definitions (and a global `notFoundComponent`) that should be wired up.

## Solution

Add `errorComponent` to the root route (and potentially child routes) using TanStack Start's built-in error boundary pattern. The component should display a user-friendly error message with a retry/reload action. Leverage `useRouteContext` or `ErrorComponentProps` from `@tanstack/react-router` to surface the error detail in dev mode only.
