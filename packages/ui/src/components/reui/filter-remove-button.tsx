'use client';

import { XIcon } from 'lucide-react';
import { useFilterContext } from './filters-context';
import type React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/button';

interface FilterRemoveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const FilterRemoveButton = ({
  className,
  icon = <XIcon />,
  ...props
}: FilterRemoveButtonProps) => {
  const context = useFilterContext();

  return (
    <Button
      variant="outline"
      size={
        context.size === 'sm'
          ? 'icon-sm'
          : context.size === 'lg'
            ? 'icon-lg'
            : 'icon'
      }
      className={cn(className)}
      {...props}
    >
      {icon}
    </Button>
  );
};
