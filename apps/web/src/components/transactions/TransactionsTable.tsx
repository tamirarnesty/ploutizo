import { useCallback, useMemo, useState } from 'react';
import { useTable } from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { dataGridFeatures } from '@ploutizo/ui/components/reui/data-grid/data-grid-features';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import { ContextMenuItem } from '@ploutizo/ui/components/context-menu';
import { toast } from '@ploutizo/ui/components/sonner-api';
import type { TransactionRow } from '@ploutizo/validators';
import {
  useDeleteTransaction,
  useRestoreTransaction,
} from '@/lib/data-access/transactions';
import { DataGridRowContextMenu } from '@/components/data-grid/DataGridRowContextMenu';
import {
  DATA_GRID_PAGINATION_ROW_CLASSNAME,
  PAGINATED_DATA_GRID_SCROLL_ORIENTATION,
} from '@/components/data-grid/dataGridSharedLayout';
import { useEffectiveTablePageSize } from '@/hooks/useEffectiveTablePageSize';
import { usePreloadLucideIcons } from '@/components/categories/usePreloadLucideIcons';
import { buildColumns } from './TransactionColumns';
import { TransactionRowActionMenuItems } from './TransactionRowActionMenus';
import { getTransactionRowActions } from './transactionRowActions';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransactionsTableEmpty } from './TransactionTableEmpty';
import { TransactionsTableEmptyFiltered } from './TransactionTableEmptyFiltered';
import { TransactionsAmountFooter } from './TransactionsAmountFooter';
import { isTransactionSortField } from './transactionSearch';
import type { TransactionSearch } from './transactionSearch';

interface TransactionsTableProps {
  transactions: TransactionRow[];
  total: number;
  isLoading: boolean;
  page: number;
  limit: number;
  sort: TransactionSearch['sort'];
  order: TransactionSearch['order'];
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (col: TransactionSearch['sort'], dir: 'asc' | 'desc') => void;
  onFilteredEmpty: boolean; // true when filters active and no results
  onClearFilters: () => void;
  onEdit: (transaction: TransactionRow) => void;
  onOpenOriginal: (id: string) => void;
}

export const TransactionsTable = ({
  transactions,
  total,
  isLoading,
  page,
  limit,
  sort,
  order,
  onPageChange,
  onLimitChange,
  onSortChange,
  onFilteredEmpty,
  onClearFilters,
  onEdit,
  onOpenOriginal,
}: TransactionsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteTransaction();
  const restoreMutation = useRestoreTransaction();

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    // AlertDialogAction fires onClick BEFORE closing the dialog, so deleteId is still
    // valid here. The dialog closes via onOpenChange(false) after this returns.
    deleteMutation.mutate(id);
    toast('Transaction deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restoreMutation.mutate(id),
      },
    });
  };

  const categoryIcons = useMemo(
    () => transactions.map((transaction) => transaction.categoryIcon),
    [transactions]
  );

  usePreloadLucideIcons(categoryIcons);

  const columns = useMemo(
    () => buildColumns(setDeleteId, onEdit, onOpenOriginal),
    [setDeleteId, onEdit, onOpenOriginal]
  );

  const effectivePageSize = useEffectiveTablePageSize(
    'transactions',
    limit,
    isLoading ? 0 : transactions.length,
    isLoading
  );

  const renderRowContextMenu = useCallback(
    (transaction: TransactionRow) => (
      <TransactionRowActionMenuItems
        actions={getTransactionRowActions(transaction, {
          onEdit,
          onDelete: setDeleteId,
        })}
        MenuItem={ContextMenuItem}
      />
    ),
    [onEdit]
  );

  const table = useTable({
    features: dataGridFeatures,
    data: transactions,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    state: {
      pagination: { pageIndex: page - 1, pageSize: effectivePageSize },
      sorting: [{ id: sort ?? 'date', desc: order === 'desc' }],
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: limit })
          : updater;
      if (next.pageSize !== limit) {
        onLimitChange(next.pageSize);
      } else {
        onPageChange(next.pageIndex + 1);
      }
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater([{ id: sort ?? 'date', desc: order === 'desc' }])
          : updater;
      const col = next[0];
      if (!isTransactionSortField(col.id)) {
        return;
      }
      onSortChange(col.id, col.desc ? 'desc' : 'asc');
    },
  });

  // Empty states (D-24, D-25) — rendered before DataGrid
  if (!isLoading && transactions.length === 0) {
    if (onFilteredEmpty) {
      return <TransactionsTableEmptyFiltered onClearFilters={onClearFilters} />;
    }
    return <TransactionsTableEmpty />;
  }

  return (
    <>
      <DeleteTransactionDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />

      <DataGrid
        table={table}
        recordCount={total}
        isLoading={isLoading}
        emptyMessage="No transactions yet"
        tableLayout={{
          width: 'fixed',
          columnsResizable: true,
        }}
      >
        <div className="w-full space-y-2.5">
          <DataGridContainer>
            <DataGridRowContextMenu renderMenu={renderRowContextMenu}>
              <DataGridScrollArea
                orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}
              >
                <DataGridTable
                  footerContent={
                    transactions.length > 0 ? (
                      <TransactionsAmountFooter
                        table={table}
                        rows={transactions}
                      />
                    ) : null
                  }
                />
              </DataGridScrollArea>
            </DataGridRowContextMenu>
          </DataGridContainer>
          <DataGridPagination className={DATA_GRID_PAGINATION_ROW_CLASSNAME} />
        </div>
      </DataGrid>
    </>
  );
};
