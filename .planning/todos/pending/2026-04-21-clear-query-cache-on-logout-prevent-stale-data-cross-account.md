---
created: 2026-04-21T19:40:00Z
title: Clear query cache on logout to prevent cross-account stale data
area: auth
files: []
---

## Problem

When a user logs out and a different account logs in, TanStack Query's in-memory cache still holds data from the previous session. The new user briefly (or persistently) sees the previous user's transactions, household, accounts, etc. This is a data privacy / correctness bug.

## Solution

Hook into Clerk's `signOut` callback (or Clerk's `useClerk().signOut`) to call `queryClient.clear()` before or immediately after sign-out completes. The QueryClient instance is accessible via `useQueryClient()` in the sign-out handler. Alternatively, subscribe to Clerk's auth state change event and clear the cache whenever `userId` transitions from a non-null value to `null` or to a different value.

Ensure the cache is cleared *before* any redirects so the next user's queries start cold.
