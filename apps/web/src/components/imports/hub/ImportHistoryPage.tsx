import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Page } from '@ploutizo/ui/components/page';
import { Text } from '@ploutizo/ui/components/text';
import { PageHeader } from '@/components/PageHeader';
import { useGetImportHistoryInfinite } from '@/lib/data-access/imports';
import { ImportHistoryList } from './ImportHistoryList';

export const ImportHistoryPage = () => {
  const historyQuery = useGetImportHistoryInfinite();
  const pages = historyQuery.data?.pages ?? [];
  const history = pages.flatMap((page) => page.data);
  const hasNextPage = historyQuery.hasNextPage;

  return (
    <Page>
      <PageHeader title="Import history" />
      <div className="space-y-3">
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
    </Page>
  );
};
