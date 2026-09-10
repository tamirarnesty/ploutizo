import { useImportReviewAutosaveHasUnsavedWork } from '@/lib/data-access/imports/useImportReviewAutosave';
import { useImportReviewLeaveGuard } from './useImportReviewLeaveGuard';

interface ImportReviewLeaveGuardProps {
  draftId: string;
  flush: () => Promise<boolean>;
}

/** Headless leave guard so autosave subscription does not re-render the review grid. */
export const ImportReviewLeaveGuard = ({
  draftId,
  flush,
}: ImportReviewLeaveGuardProps) => {
  const hasUnsavedWork = useImportReviewAutosaveHasUnsavedWork(draftId);
  useImportReviewLeaveGuard({ hasUnsavedWork, flush });
  return null;
};
