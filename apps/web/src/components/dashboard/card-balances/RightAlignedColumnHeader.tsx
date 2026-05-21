import { ChevronsUpDownIcon } from 'lucide-react';
import { useDataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import type { Column } from '@tanstack/react-table';
import type { ReactNode } from 'react';

type RightAlignedColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  icon?: ReactNode;
};

const rightAlignedHeaderClassName =
  'ms-0 px-0 text-[0.8125rem]! leading-[calc(1.125/0.8125)] font-normal! text-secondary-foreground/80 [&_svg]:size-3.5 [&_svg]:opacity-60 hover:[&_svg]:opacity-100';

/** Table cells ignore flex/text-right on `<th>` — use margin-auto block push. */
export const RightAlignedColumnHeader = <TData, TValue>({
  column,
  title,
  icon,
}: RightAlignedColumnHeaderProps<TData, TValue>) => {
  const { isLoading } = useDataGrid();
  const canSort = column.getCanSort();

  if (isLoading && canSort) {
    return (
      <div className="ms-auto w-fit max-w-full">
        <div
          className={`inline-flex h-full items-center gap-1.5 ${rightAlignedHeaderClassName}`}
        >
          {icon}
          {title}
          <ChevronsUpDownIcon className="mt-px size-3.25" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="ms-auto w-fit max-w-full">
      <DataGridColumnHeader
        column={column}
        title={title}
        icon={icon}
        className={rightAlignedHeaderClassName}
      />
    </div>
  );
};

/** Right-align cell content inside ReUI data-grid `<td>` cells. */
export const RightAlignedCell = ({ children }: { children: ReactNode }) => (
  <div className="ms-auto w-fit max-w-full">{children}</div>
);
