# 001 — Call useRender once in SortableItem

- **Status**: TODO
- **Commit**: 7eae72e
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: react-doctor/rules-of-hooks
- **Estimated scope**: 1 file, ~40 lines

## Problem

`packages/ui/src/components/reui/sortable.tsx:300` and `:334` call `useRender` in mutually exclusive branches of `SortableItem`. `useRender` is a real React hook (`@base-ui/react/use-render`). `SortableItem` renders in production for category and merchant-rule reorder (`apps/web/src/components/settings/CategoryRow.tsx`, `MerchantRuleRow.tsx`).

When a drag starts, the active item is cloned into `DragOverlay` under `IsOverlayContext`. That flips `isOverlay` from false to true between renders, so React sees a different `useRender` call site and can attach hook state to the wrong call. The same two branches also pass a fresh object to `SortableItemContext.Provider` (`jsx-no-constructed-context-values` at lines 298 and 332), so every handle re-renders whenever the item renders.

```tsx
// packages/ui/src/components/reui/sortable.tsx:287 — current
if (isOverlay) {
  const defaultProps = {
    /* overlay props, no ref */
  };
  return (
    <SortableItemContext.Provider
      value={{ listeners: undefined, isDragging: true, disabled: false }}
    >
      {useRender({
        defaultTagName: 'div',
        render,
        props: mergeProps<'div'>(defaultProps, props),
      })}
    </SortableItemContext.Provider>
  );
}

const style = {
  transition,
  transform: CSS.Transform.toString(transform),
} as CSSProperties;
const defaultProps = {
  /* dragging props, includes ref: setNodeRef, style, ...attributes */
};
return (
  <SortableItemContext.Provider
    value={{ listeners, isDragging: isSortableDragging, disabled }}
  >
    {useRender({
      defaultTagName: 'div',
      render,
      props: mergeProps<'div'>(defaultProps, props),
    })}
  </SortableItemContext.Provider>
);
```

## Target

Canonical recipe (`react-doctor/rules-of-hooks`): call the hook once unconditionally and branch only its arguments. Canonical recipe (`react-doctor/jsx-no-constructed-context-values`): `const value = useMemo(() => ({ ... }), [deps]); return <Ctx.Provider value={value}>`.

`useMemo` is already imported in this file. Match the unconditional `useRender` already used by `Sortable` at line 236. Keep `function SortableItem`.

Replace the `if (isOverlay) { return ... } return ...` pair with this:

```tsx
const itemContextValue = useMemo(
  () => ({
    listeners: isOverlay ? undefined : listeners,
    isDragging: isOverlay ? true : isSortableDragging,
    disabled: isOverlay ? false : disabled,
  }),
  [disabled, isOverlay, isSortableDragging, listeners]
);

const defaultProps = isOverlay
  ? {
      'data-slot': 'sortable-item',
      'data-value': value,
      'data-dragging': true,
      className: cn(className),
      children: props.children,
    }
  : {
      'data-slot': 'sortable-item',
      'data-value': value,
      'data-dragging': isSortableDragging,
      'data-disabled': disabled,
      ref: setNodeRef,
      style: {
        transition,
        transform: CSS.Transform.toString(transform),
      } satisfies CSSProperties,
      ...attributes,
      className: cn(
        isSortableDragging && 'z-50 opacity-50',
        disabled && 'opacity-50',
        className
      ),
      children: props.children,
    };

return (
  <SortableItemContext.Provider value={itemContextValue}>
    {useRender({
      defaultTagName: 'div',
      render,
      props: mergeProps<'div'>(defaultProps, props),
    })}
  </SortableItemContext.Provider>
);
```

Overlay items must still omit `ref`, `style`, and `attributes`. Non-overlay items must still receive them. Do not change `useSortable` options.

## Repo conventions to follow

- Imitate the unconditional `useRender` in `Sortable` in the same file (`packages/ui/src/components/reui/sortable.tsx:236`).
- Imitate the memoized provider value already in that component (`contextValue` at line 194).
- Keep `function` declarations in this file.

## Steps

1. In `SortableItem`, delete the early `if (isOverlay) return ...` and the second return. One `useRender` call remains, after the `useMemo`, with no conditional return before it.
2. Preserve the overlay vs live prop split exactly as in Target.
3. Do not edit `Sortable`, `SortableItemHandle`, or exports.

## Boundaries

- Do NOT change public props (`value`, `disabled`, `render`, `className`).
- Do NOT add dependencies or lint suppressions.
- Do NOT convert this file to arrow functions.
- STOP if `SortableItem` no longer has two `useRender` calls split by `if (isOverlay)`.

## Verification

- **Mechanical**: `pnpm dlx react-doctor@0.9.17 --scope changed` no longer reports `rules-of-hooks` or `jsx-no-constructed-context-values` for `sortable.tsx`. `pnpm --filter @ploutizo/ui typecheck` passes.
- **Behavior check**: Settings → Categories (and Merchant rules). Drag a row by its handle. The overlay follows the pointer, the row lands in the new order, and the handle still starts the drag. Keyboard sensor still reorders.
- **Done when**: both hook diagnostics are gone, typecheck passes, and a drag still reorders a settings list.
