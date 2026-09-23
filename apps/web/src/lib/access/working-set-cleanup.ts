import { endImportDraftReviewRuntime } from '@/lib/data-access/imports/releaseImportDraftReviewRuntime';
import { endImportDraftRowsCollections } from '@/lib/data-access/imports/getImportDraftRowsCollection';
import { registerWorkingSetCleanup } from './working-set-registry';

registerWorkingSetCleanup(endImportDraftReviewRuntime);
registerWorkingSetCleanup(() => {
  void endImportDraftRowsCollections();
});
