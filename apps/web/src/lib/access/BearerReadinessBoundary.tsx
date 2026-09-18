import { AccessBearerBlocked } from './AccessBearerBlocked';
import { useAccess } from './AccessProvider';
import type { ReactNode } from 'react';

type BearerReadinessBoundaryProps = {
  children: ReactNode;
};

export const BearerReadinessBoundary = ({
  children,
}: BearerReadinessBoundaryProps) => {
  const { access, bearerError, retryBearer } = useAccess();

  if (bearerError && access.status !== 'signed-out') {
    return <AccessBearerBlocked onRetry={retryBearer} />;
  }

  // Route content stays mounted; useHouseholdQuery reports loading until bearer-ready.
  return children;
};
