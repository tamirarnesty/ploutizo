import { type VariantProps } from 'class-variance-authority';
import { type useRender } from '@base-ui/react/use-render';

import { type badgeVariants } from '@/components/reui/badge-variants';

export interface BadgeProps extends useRender.ComponentProps<'span'> {
  variant?: VariantProps<typeof badgeVariants>['variant'];
  size?: VariantProps<typeof badgeVariants>['size'];
  radius?: VariantProps<typeof badgeVariants>['radius'];
}
