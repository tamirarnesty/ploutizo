import { MoreHorizontal } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import type { ComponentType, ReactNode } from 'react';
import type { TransactionRowAction } from './transactionRowActions';

type RowActionMenuItemProps = {
  variant?: TransactionRowAction['variant'];
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export const TransactionRowActionMenuItems = ({
  actions,
  MenuItem,
}: {
  actions: readonly TransactionRowAction[];
  MenuItem: ComponentType<RowActionMenuItemProps>;
}) =>
  actions.map((action) => (
    <MenuItem
      key={action.id}
      variant={action.variant}
      disabled={action.disabled}
      onClick={action.onSelect}
    >
      {action.label}
    </MenuItem>
  ));

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
            // Touch has no hover, so the button stays visible. A mouse hides it until the row is hovered.
            className="pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:data-popup-open:opacity-100 pointer-fine:[tr:hover_&]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <TransactionRowActionMenuItems
          actions={actions}
          MenuItem={DropdownMenuItem}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
