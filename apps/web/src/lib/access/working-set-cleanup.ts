import { endImportDraftReviewRuntime } from '@/lib/data-access/imports/releaseImportDraftReviewRuntime';
import { endImportDraftRowsCollections } from '@/lib/data-access/imports/getImportDraftRowsCollection';
import {
  pauseOfflineCollectionFlush,
  releaseOfflineCollections,
} from '@/lib/offline/offline-collections';
import { resetOfflineReadStore } from '@/lib/offline/offline-read-store';
import { trackBrowserPersistenceRelease } from '@/lib/persistence/browser-persistence';
import { registerWorkingSetCleanup } from './working-set-registry';

registerWorkingSetCleanup(endImportDraftReviewRuntime);
registerWorkingSetCleanup(() => {
  void endImportDraftRowsCollections();
});
registerWorkingSetCleanup(() => {
  pauseOfflineCollectionFlush();
  resetOfflineReadStore();
  trackBrowserPersistenceRelease(releaseOfflineCollections());
});
