import { type Ref } from 'react';
import { cva } from 'class-variance-authority';

export const dataGridBodyCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2 py-1.5',
      default: 'px-3 py-2',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export const dataGridTablePinnedBodyCellClasses =
  'data-pinned:backdrop-blur-xs data-pinned:bg-background/90 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border';

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
