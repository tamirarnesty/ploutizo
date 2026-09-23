import '@/lib/access/working-set-cleanup';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginWorkingSetScope,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
  markImportReviewPersistStart,
  markImportReviewPersistSuccess,
} from './importReviewAutosave';
import { runImportDraftPersist } from './runImportDraftPersist';

describe('runImportDraftPersist', () => {
  afterEach(() => {
    endImportReviewAutosave();
    resetWorkingSetRegistryForTests();
  });

  it('runs success when the working set stays current', async () => {
    const scope = beginWorkingSetScope();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart: vi.fn(),
      persist: async () => 'ok',
      onSuccess,
      onFailure,
    });

    expect(onSuccess).toHaveBeenCalledWith('ok');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('skips success after a household switch during persist', async () => {
    const scope = beginWorkingSetScope();
    const onSuccess = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart: vi.fn(),
      persist: async () => {
        replaceActiveWorkingSet();
        return 'late';
      },
      onSuccess,
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('skips beforePersist completion when the scope goes stale during flush', async () => {
    const scope = beginWorkingSetScope();
    const onStart = vi.fn();
    const onSuccess = vi.fn();

    await runImportDraftPersist({
      scope,
      beforePersist: async () => {
        replaceActiveWorkingSet();
      },
      onStart,
      persist: async () => 'ok',
      onSuccess,
    });

    expect(onStart).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not run onStart when stale before persist', async () => {
    const scope = beginWorkingSetScope();
    replaceActiveWorkingSet();
    const onStart = vi.fn();

    await runImportDraftPersist({
      scope,
      onStart,
      persist: async () => 'ok',
      onSuccess: vi.fn(),
    });

    expect(onStart).not.toHaveBeenCalled();
  });

  it('A→B→A: stale row persist does not corrupt a newer operation autosave state', async () => {
    const draftId = 'draft_1';
    const rowId = 'row_1';
    const scopeA = beginWorkingSetScope();

    markImportReviewPersistStart(draftId, rowId);
    replaceActiveWorkingSet();
    replaceActiveWorkingSet();

    markImportReviewPersistStart(draftId, rowId);
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('saving');

    await runImportDraftPersist({
      scope: scopeA,
      persist: async () => 'stale',
      onSuccess: vi.fn(),
    });

    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('saving');

    markImportReviewPersistSuccess(draftId, rowId);
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('saved');
  });

  it('runs onFailure when onSuccess throws', async () => {
    const scope = beginWorkingSetScope();
    const onFailure = vi.fn();

    const ok = await runImportDraftPersist({
      scope,
      persist: async () => 'ok',
      onSuccess: () => {
        throw new Error('confirm failed');
      },
      onFailure,
    });

    expect(ok).toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
