import { AccessBearerBlocked } from './AccessBearerBlocked';
import { useAccess } from './AccessProvider';
import { isHouseholdBearerReady } from './household-loader-ready';
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

  if (
    access.status === 'signed-in-with-active-household' &&
    !isHouseholdBearerReady(isReady, access)
  ) {
    return null;
  }

  return children;
};
