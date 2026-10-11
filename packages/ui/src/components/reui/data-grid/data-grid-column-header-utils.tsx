import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const getDataGridColumnHeaderSortIcon = (
  canSort: boolean,
  isSorted: false | 'asc' | 'desc'
) =>
  canSort &&
  (isSorted === 'desc' ? (
    <ArrowDownIcon className="size-3.25" />
  ) : isSorted === 'asc' ? (
    <ArrowUpIcon className="size-3.25" />
  ) : (
    <ChevronsUpDownIcon className="mt-px size-3.25" />
  ));

export const getDataGridColumnHeaderClassNames = (className?: string) => ({
  headerLabelClassName: cn(
    'inline-flex h-full items-center gap-1.5 text-[0.8125rem] leading-[calc(1.125/0.8125)] font-normal text-secondary-foreground/80 [&_svg]:size-3.5 [&_svg]:opacity-60',
    className
  ),
  headerButtonClassName: cn(
    '-ms-2 h-6 rounded-lg px-2 font-normal text-secondary-foreground/80 hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground',
    className
  ),
});
