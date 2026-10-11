import { type ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { type ReactNode } from 'react';

export type DataGridScrollAreaOrientation = 'horizontal' | 'vertical' | 'both';

export type DataGridScrollAreaProps = Omit<
  ScrollAreaPrimitive.Root.Props,
  'children'
> & {
  children: ReactNode;
  orientation?: DataGridScrollAreaOrientation;
};
