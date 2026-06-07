import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSettingsEntityDialog } from '@/hooks/useSettingsEntityDialog';

type TestEntity = { id: string; name: string };

describe('useSettingsEntityDialog', () => {
  it('keeps entity when closing so dialog content does not remount mid-exit', () => {
    const entity: TestEntity = { id: 'e-1', name: 'Groceries' };
    const { result } = renderHook(() => useSettingsEntityDialog<TestEntity>());

    act(() => result.current.openEdit(entity));
    expect(result.current.open).toBe(true);

    act(() => result.current.onOpenChange(false));

    expect(result.current.open).toBe(false);
    expect(result.current.entity).toBe(entity);
  });

  it('clears entity on openCreate', () => {
    const { result } = renderHook(() => useSettingsEntityDialog<TestEntity>());

    act(() => result.current.openEdit({ id: 'e-1', name: 'Groceries' }));
    act(() => result.current.openCreate());

    expect(result.current.open).toBe(true);
    expect(result.current.entity).toBeNull();
  });

  it('replaces entity on openEdit', () => {
    const first: TestEntity = { id: 'e-1', name: 'A' };
    const second: TestEntity = { id: 'e-2', name: 'B' };
    const { result } = renderHook(() => useSettingsEntityDialog<TestEntity>());

    act(() => result.current.openEdit(first));
    act(() => result.current.openEdit(second));

    expect(result.current.entity).toBe(second);
  });
});
