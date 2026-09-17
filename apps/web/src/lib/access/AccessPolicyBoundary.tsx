import { AccessBearerBlocked } from './AccessBearerBlocked';
import { useAccess } from './AccessProvider';
import type { ReactNode } from 'react';

type BearerReadinessBoundaryProps = {
  children: ReactNode;
};

export const BearerReadinessBoundary = ({
  children,
}: BearerReadinessBoundaryProps) => {
  const { access, isReady, bearerError, retryBearer } = useAccess();

  if (bearerError && access.status !== 'signed-out') {
    return <AccessBearerBlocked onRetry={retryBearer} />;
  }

  if (!isReady) {
    return null;
  }

  return children;
};
