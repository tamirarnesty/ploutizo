import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';
import {
  releaseImportDraftSession,
  releaseImportDraftWorkingCopyForFinalize,
} from './releaseImportDraftSession';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_release_1',
  rows: [makeImportDraftRow({ id: 'row_1' })],
});

describe('releaseImportDraftSession', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  it('cancels in-flight draft queries before releasing the working copy', async () => {
    const queryClient = getActiveQueryClient();
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');
    getImportDraftRowsCollection(draft.id);

    await releaseImportDraftSession(draft.id);

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: importDraftQueryKey(draft.id),
    });
    expect(
      queryClient.getQueryData(importDraftQueryKey(draft.id))
    ).toBeUndefined();
  });
});

describe('releaseImportDraftWorkingCopyForFinalize', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  it('cancels draft queries and replaces the rows collection instance', async () => {
    const queryClient = getActiveQueryClient();
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');
    const first = getImportDraftRowsCollection(draft.id);

    await releaseImportDraftWorkingCopyForFinalize(draft.id);

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: importDraftQueryKey(draft.id),
    });
    expect(getImportDraftRowsCollection(draft.id)).not.toBe(first);
  });
});
