import { type ComponentProps, type ReactNode } from 'react';

import { Button } from '@/components/button';
import { Spinner } from '@/components/spinner';

export type LoadingButtonProps = ComponentProps<typeof Button> & {
  /** Leading icon shown when not loading. Replaced by the spinner while loading. */
  icon?: ReactNode;
  loading?: boolean;
  /** Label while loading. Falls back to `children` when omitted. */
  loadingText?: ReactNode;
};

export const LoadingButton = ({
  icon,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) => {
  const label = loading ? (loadingText ?? children) : children;
  const leadingIcon = loading ? <Spinner /> : icon;

  return (
    <Button disabled={disabled || loading} {...props}>
      {leadingIcon ? <span data-icon="inline-start">{leadingIcon}</span> : null}
      {label}
    </Button>
  );
};
