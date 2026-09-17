import type { WorkingSetScope } from '@/lib/access/working-set-registry';

type RunImportDraftPersistOptions<T> = {
  scope: WorkingSetScope;
  beforePersist?: () => Promise<void>;
  onStart?: () => void;
  persist: () => Promise<T>;
  onSuccess: (result: T) => void;
  onFailure?: () => void;
};

/**
 * Run an import-review persist under a working-set scope.
 * Checkpoints after every await; stale scopes abort without success/failure.
 * Stale exits do not adjust autosave in-flight counters — working-set cleanup
 * clears autosave on switch, and draftId/rowId aborts would corrupt a newer
 * operation after an A→B→A household transition.
 */
export const runImportDraftPersist = async <T>({
  scope,
  beforePersist,
  onStart,
  persist,
  onSuccess,
  onFailure,
}: RunImportDraftPersistOptions<T>): Promise<boolean> => {
  if (beforePersist) {
    await beforePersist();
    if (!scope.isCurrent()) {
      return false;
    }
  }

  if (!scope.isCurrent()) {
    return false;
  }

  onStart?.();

  try {
    const result = await persist();
    if (!scope.isCurrent()) {
      return false;
    }
    onSuccess(result);
    return true;
  } catch {
    if (!scope.isCurrent()) {
      return false;
    }
    onFailure?.();
    return false;
  }
};
