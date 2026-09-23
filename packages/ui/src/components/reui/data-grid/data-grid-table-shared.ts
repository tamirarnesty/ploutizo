import { type Ref } from 'react';

export const dataGridRowBorderClasses =
  'data-[row-border]:border-b data-[row-border]:border-border data-[row-border]:[&:not(:last-child)>td]:border-b';

export const getDataGridBodyRowBorderEnabled = (
  rowBorder: boolean,
  rowBorderWhenExpanded: boolean | undefined,
  isExpanded: boolean
) => {
  if (!rowBorder) return false;
  if (!isExpanded) return true;
  return rowBorderWhenExpanded ?? rowBorder;
};

export const assignDataGridTableRef = <T>(
  ref: Ref<T> | undefined,
  value: T | null
) => {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as { current: T | null }).current = value;
};
