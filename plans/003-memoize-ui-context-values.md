# 003 — Memoize shared UI context values

- **Status**: TODO
- **Commit**: 7eae72e
- **Severity**: HIGH
- **Category**: Performance
- **Rule**: react-doctor/jsx-no-constructed-context-values
- **Estimated scope**: 4 files

## Problem

These providers sit on surfaces that render for every session (dashboard charts and period picker, transaction filters, toggle groups). Each one passes an object literal as `value`, so every consumer re-renders whenever the provider renders, even when the fields are unchanged.

```tsx
// packages/ui/src/components/chart.tsx:61
<ChartContext.Provider value={{ config }}>

// packages/ui/src/components/date-range-picker.tsx:78
<DateRangePickerContext
  value={{
    open,
    pending,
    setPending,
    committed,
    apply,
    cancel: () => setOpen(false),
  }}
>

// packages/ui/src/components/reui/filters.tsx:1686
<FilterContext.Provider
  value={{
    variant,
    size,
    radius,
    i18n: mergedI18n,
    className,
    trigger,
    allowMultiple,
  }}
>

// packages/ui/src/components/toggle-group.tsx:49
<ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
```

`mergedI18n` is also a new object every render (`filters.tsx:1491`), so memoizing the provider alone would still change every time. `DateRangePicker`'s `committed` is `toDateRange(value)`, a new object whenever `value` is a new object, and `apply` / `cancel` are new functions every render.

React has no compiler here (`hasReactCompiler: false`), so `useMemo` / `useCallback` are the fix the rule ships.

## Target

Canonical recipe: `const value = useMemo(() => ({ user, theme }), [user, theme]); return <Ctx.Provider value={value}>`. Functions that go into that object are `useCallback`.

### chart.tsx

`React` is already imported as a namespace. Inside `ChartContainer`, before the return:

```tsx
const chartContextValue = React.useMemo(() => ({ config }), [config]);
```

```tsx
<ChartContext.Provider value={chartContextValue}>
```

Leave the `function` declaration. This file is the Ploutizo chart fork.

### date-range-picker.tsx

Add `useCallback` and `useMemo` to the existing react import. Replace the inline `apply` and the inline context:

```tsx
const committed = useMemo(() => toDateRange(value), [value?.from, value?.to]);

const apply = useCallback(() => {
  if (!pending?.from || !pending.to) return;
  onApply({ from: pending.from, to: pending.to });
  setOpen(false);
}, [onApply, pending]);

const cancel = useCallback(() => {
  setOpen(false);
}, []);

const contextValue = useMemo(
  () => ({
    open,
    pending,
    setPending,
    committed,
    apply,
    cancel,
  }),
  [apply, cancel, committed, open, pending]
);
```

`setPending` from `useState` is stable; omit it from the dependency list. Pass `value={contextValue}`. Delete the old `const apply = () => ...` so there is only one `apply`.

### filters.tsx

`useMemo` is already imported. Replace the `const mergedI18n` assignment and the provider value. Do not change the spread merge itself (that object shape is the i18n contract):

```tsx
const mergedI18n = useMemo<FilterI18nConfig>(
  () => ({
    ...DEFAULT_I18N,
    ...i18n,
    operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
    placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
    validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
  }),
  [i18n]
);

const filterContextValue = useMemo(
  () => ({
    variant,
    size,
    radius,
    i18n: mergedI18n,
    className,
    trigger,
    allowMultiple,
  }),
  [allowMultiple, className, mergedI18n, radius, size, trigger, variant]
);
```

`<FilterContext.Provider value={filterContextValue}>`. Do not add `showSearchInput` to the value; it is not there today.

### toggle-group.tsx

`import * as React` is already there. Inside `ToggleGroup`, before the return:

```tsx
const contextValue = React.useMemo(
  () => ({ variant, size, spacing, orientation }),
  [orientation, size, spacing, variant]
);
```

`<ToggleGroupContext.Provider value={contextValue}>`. Keep `function ToggleGroup`.

## Repo conventions to follow

- Imitate `const contextValue = useMemo(() => ({ activeId, modifiers }), [activeId, modifiers])` in `packages/ui/src/components/reui/sortable.tsx:194`.
- Date-range picker already uses arrow functions. Chart, filters, and toggle-group keep their current `function` declarations.

## Steps

1. Apply the four targets above. Do not restyle, rename exports, or change context type fields.
2. If `react-hooks/exhaustive-deps` wants `value` instead of `value?.from` / `value?.to` on the date-range memo, depend on `value` as well.
3. Re-read the diff and drop anything that is not a memo wrapper or an import.

## Boundaries

- Do NOT edit `sortable.tsx` or `data-grid-table-dnd-rows.tsx` (other plans own those).
- Do NOT edit `apps/web`.
- Do NOT add dependencies or lint suppressions.
- STOP if a provider value is already an identifier.

## Verification

- **Mechanical**: React Doctor no longer reports `jsx-no-constructed-context-values` for these four files. `pnpm --filter @ploutizo/ui typecheck` and `pnpm --filter @ploutizo/ui test` pass. `pnpm --filter web test` still passes for the date-range and filter call sites if you touch behavior (you should not).
- **Behavior check**: Dashboard period picker still opens on the committed range, Apply commits, Cancel discards. Transaction filters still add, edit, and remove a chip. A chart tooltip still shows the series name. A toggle group still shows the selected item.
- **Done when**: the four diagnostics are clear and those interactions behave as before.
