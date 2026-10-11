'use client';

import { PinOffIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Column } from '@tanstack/react-table';
import { Button } from '@/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { cn } from '@/lib/utils';

type DataGridColumnHeaderSharedProps = {
  resolvedTitle: string;
  icon?: ReactNode;
  className?: string;
  headerButtonClassName: string;
  headerLabelClassName: string;
  sortIcon: ReactNode;
  isLoading: boolean;
  recordCount: number;
};

export const DataGridColumnHeaderMenuView = ({
  resolvedTitle,
  icon,
  headerButtonClassName,
  sortIcon,
  isLoading,
  recordCount,
  menuItems,
  showUnpin,
  onUnpin,
}: DataGridColumnHeaderSharedProps & {
  menuItems: Array<ReactNode>;
  showUnpin: boolean;
  onUnpin: () => void;
}) => (
  <div className="flex h-full items-center justify-between gap-1.5">
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={headerButtonClassName}
            disabled={isLoading || recordCount === 0}
          >
            {icon && icon}
            {resolvedTitle}
            {sortIcon}
          </Button>
        }
      />
      <DropdownMenuContent className="w-40" align="start">
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
    {showUnpin && (
      <Button
        size="icon-sm"
        variant="ghost"
        className="-me-1 size-7 rounded-md"
        onClick={onUnpin}
        aria-label={`Unpin ${resolvedTitle} column`}
        title={`Unpin ${resolvedTitle} column`}
      >
        <PinOffIcon className="size-3.5! opacity-50!" aria-hidden="true" />
      </Button>
    )}
  </div>
);

export const DataGridColumnHeaderSortButtonView = ({
  resolvedTitle,
  icon,
  headerButtonClassName,
  sortIcon,
  isLoading,
  recordCount,
  onSort,
}: DataGridColumnHeaderSharedProps & { onSort: () => void }) => (
  <div className="flex h-full items-center">
    <Button
      variant="ghost"
      className={headerButtonClassName}
      disabled={isLoading || recordCount === 0}
      onClick={onSort}
    >
      {icon && icon}
      {resolvedTitle}
      {sortIcon}
    </Button>
  </div>
);

export const DataGridColumnHeaderLabelView = ({
  resolvedTitle,
  icon,
  headerLabelClassName,
}: Pick<
  DataGridColumnHeaderSharedProps,
  'resolvedTitle' | 'icon' | 'headerLabelClassName'
>) => (
  <div className={headerLabelClassName}>
    {icon && icon}
    {resolvedTitle}
  </div>
);
