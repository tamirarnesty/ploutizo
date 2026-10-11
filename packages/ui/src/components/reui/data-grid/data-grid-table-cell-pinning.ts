import { type Column } from '@tanstack/react-table';

export const getDataGridTableColumnPinPresentation = <TData>(
  column: Column<TData, unknown>
) => {
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned =
    isPinned === 'right' && column.getIsFirstColumn('right');

  return {
    isPinned,
    isLastLeftPinned,
    isFirstRightPinned,
    dataLastCol: isLastLeftPinned
      ? 'left'
      : isFirstRightPinned
        ? 'right'
        : undefined,
  };
};
