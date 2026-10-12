import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Text } from '@ploutizo/ui/components/text';
import { useGetImportHistoryInfinite } from '@/lib/data-access/imports';
import { ImportHubBreadcrumb } from '../lib/ImportHubBreadcrumb';
import { ImportHistoryList } from './ImportHistoryList';

export const ImportHistoryPage = () => {
  const historyQuery = useGetImportHistoryInfinite();
  const pages = historyQuery.data?.pages ?? [];
  const history = pages.flatMap((page) => page.data);
  const hasNextPage = historyQuery.hasNextPage;

  return (
    <div className="space-y-8">
      <ImportHubBreadcrumb currentPage="Import history" />

      <div className="space-y-3">
        <Text as="h1" variant="h3">
          Import history
        </Text>
        {historyQuery.isError ? (
          <Text variant="error">
            Couldn&apos;t load import history. Check your connection and try
            again.
          </Text>
        ) : (
          <>
            <ImportHistoryList
              history={history}
              isLoading={historyQuery.isLoading}
              emptyMessage="No import history."
              variant="detailed"
            />
            {hasNextPage ? (
              <LoadingButton
                type="button"
                loading={historyQuery.isFetchingNextPage}
                loadingText="Loading…"
                variant="outline"
                onClick={() => {
                  void historyQuery.fetchNextPage();
                }}
              >
                Load more
              </LoadingButton>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
