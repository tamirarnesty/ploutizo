---
title: Dynamic Imports for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, react-lazy
---

## Dynamic Imports for Heavy Components

Use `React.lazy()` for heavy components that are not needed on initial load.

> **For this project (TanStack Start/Vite SPA):** use `React.lazy()` + `<Suspense>`. The `next/dynamic` API is Next.js-only.

**Incorrect (HeavyChart bundles with main chunk — increases bundle parsed on load):**

```tsx
// BAD: Loading HeavyChart on initial render increases bundle parsed on load
import HeavyChart from './HeavyChart'

export function Dashboard() {
  return <HeavyChart data={data} />
}
```

**Correct (React.lazy() defers parsing until component is actually rendered):**

```tsx
// GOOD: React.lazy() defers parsing until component is actually rendered
import { lazy, Suspense } from 'react'
const HeavyChart = lazy(() => import('./HeavyChart'))

export function Dashboard() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart data={data} />
    </Suspense>
  )
}
```
