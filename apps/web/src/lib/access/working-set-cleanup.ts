import { endImportDraftRowPacedMutations } from '@/lib/data-access/imports/getImportDraftRowPacedMutations';
import { endImportDraftRowsCollections } from '@/lib/data-access/imports/getImportDraftRowsCollection';
import { endImportReviewAutosave } from '@/lib/data-access/imports/importReviewAutosave';
import { registerWorkingSetCleanup } from './working-set';

registerWorkingSetCleanup(endImportDraftRowPacedMutations);
registerWorkingSetCleanup(() => {
  void endImportDraftRowsCollections();
});
registerWorkingSetCleanup(endImportReviewAutosave);
