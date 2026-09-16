import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { resolveAccessNavigation, resolveAccessRedirect } from './access-state';
import { useAccess } from './AccessProvider';
import type { AccessPolicy } from './access-state';
import type { ReactNode } from 'react';

type AccessPolicyBoundaryProps = {
  policy: AccessPolicy;
  returnPath?: string;
  children: ReactNode;
};

export const AccessPolicyBoundary = ({
  policy,
  returnPath,
  children,
}: AccessPolicyBoundaryProps) => {
  const { access, isReady } = useAccess();
  const navigate = useNavigate();
  const locationHref = useRouterState({
    select: (state) => state.location.href,
  });
  const effectiveReturnPath = returnPath ?? locationHref;
  const redirectTarget = resolveAccessRedirect(access, policy);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    const target = resolveAccessNavigation(access, policy, effectiveReturnPath);
    if (target) {
      void navigate(target);
    }
  }, [access, effectiveReturnPath, isReady, navigate, policy]);

  if (!isReady || redirectTarget) {
    return null;
  }

  return children;
};
