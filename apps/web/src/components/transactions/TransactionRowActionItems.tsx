import type { ComponentType, ReactNode } from 'react';
import type { TransactionRowAction } from './transactionRowActions';

export type TransactionRowActionItemProps = {
  variant?: TransactionRowAction['variant'];
  onClick: () => void;
  children: ReactNode;
};

export const TransactionRowActionItems = ({
  actions,
  Item,
}: {
  actions: readonly TransactionRowAction[];
  Item: ComponentType<TransactionRowActionItemProps>;
}) => (
  <>
    {actions.map((action) => (
      <Item key={action.id} variant={action.variant} onClick={action.onSelect}>
        {action.label}
      </Item>
    ))}
  </>
);
