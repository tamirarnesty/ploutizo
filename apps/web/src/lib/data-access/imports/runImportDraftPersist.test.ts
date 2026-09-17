import '@/lib/access/working-set-cleanup';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginWorkingSetScope,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import { runImportDraftPersist } from './runImportDraftPersist';

describe('runImportDraftPersist', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
  });

  it('runs success when the working set stays current', async () => {
    const scope = beginWorkingSetScope();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const onStale = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart: vi.fn(),
      onStale,
      persist: async () => 'ok',
      onSuccess,
      onFailure,
    });

    expect(onSuccess).toHaveBeenCalledWith('ok');
    expect(onFailure).not.toHaveBeenCalled();
    expect(onStale).not.toHaveBeenCalled();
  });

  it('skips success after a household switch during persist', async () => {
    const scope = beginWorkingSetScope();
    const onSuccess = vi.fn();
    const onStale = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart: vi.fn(),
      onStale,
      persist: async () => {
        replaceActiveWorkingSet();
        return 'late';
      },
      onSuccess,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('skips beforePersist completion when the scope goes stale during flush', async () => {
    const scope = beginWorkingSetScope();
    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onStale = vi.fn();

    await runImportDraftPersist({
      scope,
      beforePersist: async () => {
        replaceActiveWorkingSet();
      },
      onStart,
      onStale,
      persist: async () => 'ok',
      onSuccess,
    });

    expect(onStart).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onStale).not.toHaveBeenCalled();
  });

  it('does not call onStale when stale before onStart', async () => {
    const scope = beginWorkingSetScope();
    replaceActiveWorkingSet();
    const onStale = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart: vi.fn(),
      onStale,
      persist: async () => 'ok',
      onSuccess: vi.fn(),
    });

    expect(onStale).not.toHaveBeenCalled();
  });

  it('calls onStale when tracksInFlight and stale after persist', async () => {
    const scope = beginWorkingSetScope();
    const onStale = vi.fn();

    await runImportDraftPersist({
      scope,
      tracksInFlight: true,
      onStale,
      persist: async () => {
        replaceActiveWorkingSet();
        return 'late';
      },
      onSuccess: vi.fn(),
    });

    expect(onStale).toHaveBeenCalledTimes(1);
  });
});
