import { MoreHorizontal } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { TransactionRowActionItems } from './TransactionRowActionItems';
import type { TransactionRowAction } from './transactionRowActions';

export const TransactionRowActionsDropdown = ({
  actions,
}: {
  actions: readonly TransactionRowAction[];
}) => (
  <div className="flex justify-center">
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Transaction actions"
            className="opacity-0 focus-visible:opacity-100 data-popup-open:opacity-100 [tr:hover_&]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <TransactionRowActionItems actions={actions} Item={DropdownMenuItem} />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
