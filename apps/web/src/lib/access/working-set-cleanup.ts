import { endImportDraftPacedMutations } from '@/lib/data-access/imports/getImportDraftPacedMutations';
import { endImportDraftPersistBaselines } from '@/lib/data-access/imports/importDraftPersistBaselines';
import { endImportDraftWorkingCopyRederive } from '@/lib/data-access/imports/scheduleImportDraftWorkingCopyRederive';
import { endImportDraftRowsCollections } from '@/lib/data-access/imports/getImportDraftRowsCollection';
import { endImportReviewAutosave } from '@/lib/data-access/imports/importReviewAutosave';
import { registerWorkingSetCleanup } from './working-set-registry';

registerWorkingSetCleanup(endImportDraftPacedMutations);
registerWorkingSetCleanup(endImportDraftPersistBaselines);
registerWorkingSetCleanup(endImportDraftWorkingCopyRederive);
registerWorkingSetCleanup(() => {
  void endImportDraftRowsCollections();
});
registerWorkingSetCleanup(endImportReviewAutosave);
