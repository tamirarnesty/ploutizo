import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import type { Column } from '@tanstack/react-table';
import type { ReactNode } from 'react';

type RightAlignedColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  icon?: ReactNode;
};

/** Table cells ignore flex/text-right on `<th>` — use margin-auto block push. */
export const RightAlignedColumnHeader = <TData, TValue>({
  column,
  title,
  icon,
}: RightAlignedColumnHeaderProps<TData, TValue>) => (
  <div className="ms-auto w-fit max-w-full">
    <DataGridColumnHeader
      column={column}
      title={title}
      icon={icon}
      className="ms-0 px-0 text-[0.8125rem]! leading-[calc(1.125/0.8125)] font-normal! text-secondary-foreground/80 [&_svg]:size-3.5 [&_svg]:opacity-60 hover:[&_svg]:opacity-100"
    />
  </div>
);

/** Right-align cell content inside ReUI data-grid `<td>` cells. */
export const RightAlignedCell = ({ children }: { children: ReactNode }) => (
  <div className="ms-auto w-fit max-w-full">{children}</div>
);
