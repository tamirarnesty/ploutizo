import { within } from '@testing-library/react';
import { expect } from 'vitest';

export const TRANSACTION_ROW_ACTION_LABELS = ['Edit', 'Delete'] as const;

export const getTransactionRowActionMenuLabels = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent);

export const expectTransactionRowActionMenuLabels = (menu: HTMLElement) => {
  expect(getTransactionRowActionMenuLabels(menu)).toEqual([
    ...TRANSACTION_ROW_ACTION_LABELS,
  ]);
};
