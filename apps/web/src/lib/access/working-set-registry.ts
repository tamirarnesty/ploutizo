import {
  createWorkingSet,
  resetWorkingSetIdsForTests,
} from './create-working-set';
import {
  bumpWorkingSetEpoch,
  resetWorkingSetEpochForTests,
} from './working-set-epoch';
import type { WorkingSet } from './create-working-set';

type WorkingSetCleanup = () => void;

const workingSetCleanups: WorkingSetCleanup[] = [];
let activeWorkingSet: WorkingSet = createWorkingSet();

export const getActiveQueryClient = () => activeWorkingSet.queryClient;

export const getActiveWorkingSet = () => activeWorkingSet;

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
  bumpWorkingSetEpoch();
  activeWorkingSet = createWorkingSet();
  return activeWorkingSet;
};

export const resetWorkingSetRegistryForTests = () => {
  teardownWorkingSet(activeWorkingSet);
  runCleanups();
  resetWorkingSetIdsForTests();
  resetWorkingSetEpochForTests();
  activeWorkingSet = createWorkingSet();
};
