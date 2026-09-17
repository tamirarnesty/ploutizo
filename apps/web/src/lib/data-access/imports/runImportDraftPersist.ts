import type { WorkingSetScope } from '@/lib/access/working-set-registry';

type RunImportDraftPersistOptions<T> = {
  scope: WorkingSetScope;
  beforePersist?: () => Promise<void>;
  onStart?: () => void;
  /** When true, stale exits after onStart call onStale. Defaults to onStart !== undefined. */
  tracksInFlight?: boolean;
  onStale?: () => void;
  persist: () => Promise<T>;
  onSuccess: (result: T) => void;
  onFailure?: () => void;
};

/**
 * Run an import-review persist under a working-set epoch scope.
 * Checkpoints after every await; stale scopes abort without success/failure.
 */
export const runImportDraftPersist = async <T>({
  scope,
  beforePersist,
  onStart,
  tracksInFlight,
  onStale,
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

  const inFlightTracked = tracksInFlight ?? onStart !== undefined;
  onStart?.();

  try {
    const result = await persist();
    if (!scope.isCurrent()) {
      if (inFlightTracked) {
        onStale?.();
      }
      return false;
    }
    onSuccess(result);
    return true;
  } catch {
    if (!scope.isCurrent()) {
      if (inFlightTracked) {
        onStale?.();
      }
      return false;
    }
    onFailure?.();
    return false;
  }
};
