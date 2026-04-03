# Tech Debt Notes

---

## Missing QueryClientProvider

**File:** `apps/web/src/routes/__root.tsx`

`queryClient` is instantiated as a singleton in `apps/web/src/lib/queryClient.ts` but is never connected to React context — there is no `<QueryClientProvider>` in the component tree. TanStack Start does not inject one automatically.

Any mutation hook that calls `useQueryClient()` will throw `"No QueryClient set, use QueryClientProvider to set one"` at runtime.

**Fix (option A):** Wrap `{children}` in `<QueryClientProvider client={queryClient}>` inside `RootDocument` in `__root.tsx`.

```tsx
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

// Inside RootDocument, wrap children:
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

**Affects:** All mutation hooks in `apps/web/src/hooks/` that call `useQueryClient()` (use-accounts.ts, use-categories.ts, use-merchant-rules.ts, use-tags.ts).
