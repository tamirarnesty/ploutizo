import { type ComponentProps, type ReactNode } from 'react';

import { Button } from '@/components/button';
import { Spinner } from '@/components/spinner';

export type LoadingButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  /** Label while loading. Falls back to `children` when omitted. */
  loadingText?: ReactNode;
};

export const LoadingButton = ({
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) => {
  const label = loading ? (loadingText ?? children) : children;

  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
};
