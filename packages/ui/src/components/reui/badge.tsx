import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import type { BadgeProps } from '@/components/reui/badge-types';
import { badgeVariants } from '@/components/reui/badge-variants';
import { cn } from '@/lib/utils';

const Badge = ({
  className,
  variant,
  size,
  radius,
  render,
  ...props
}: BadgeProps) => {
  const defaultProps = {
    'data-slot': 'badge',
    className: cn(badgeVariants({ variant, size, radius, className })),
  };

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps<'span'>(defaultProps, props),
  });
};

export { Badge };
