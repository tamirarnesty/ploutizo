import {
  createWorkingSet,
  resetWorkingSetIdsForTests,
} from './create-working-set';
import type { WorkingSet } from './create-working-set';

type WorkingSetCleanup = () => void;

const workingSetCleanups: WorkingSetCleanup[] = [];
let activeWorkingSet: WorkingSet = createWorkingSet();

export const getActiveQueryClient = () => activeWorkingSet.queryClient;

export const getActiveWorkingSet = () => activeWorkingSet;

/** Captures the active working set at user-intent time for async persist guards. */
export type WorkingSetScope = {
  isCurrent: () => boolean;
};

export const beginWorkingSetScope = (): WorkingSetScope => {
  const workingSetId = activeWorkingSet.id;
  return {
    isCurrent: () => activeWorkingSet.id === workingSetId,
  };
};

export const registerWorkingSetCleanup = (cleanup: WorkingSetCleanup) => {
  workingSetCleanups.push(cleanup);
};

const runCleanups = () => {
  for (const cleanup of workingSetCleanups) {
    cleanup();
  }
};

const teardownWorkingSet = (workingSet: WorkingSet) => {
  void workingSet.dispose();
};

export const replaceActiveWorkingSet = (): WorkingSet => {
  teardownWorkingSet(activeWorkingSet);
  runCleanups();
  activeWorkingSet = createWorkingSet();
  return activeWorkingSet;
};

export const resetWorkingSetRegistryForTests = () => {
  teardownWorkingSet(activeWorkingSet);
  runCleanups();
  resetWorkingSetIdsForTests();
  activeWorkingSet = createWorkingSet();
};
