import { useCallback, useEffect } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { persistSpendTrendMode } from '@/lib/spend-trend-mode';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

const dashboardRouteApi = getRouteApi('/_layout/dashboard');

export const useSpendTrendMode = () => {
  const mode = dashboardRouteApi.useRouteContext({
    select: (context) => context.spendTrendMode,
  });
  const navigate = useNavigate({ from: '/dashboard' });

  // Also covers modes arriving by URL, so a shared link becomes the viewer's mode.
  useEffect(() => {
    persistSpendTrendMode(mode);
  }, [mode]);

  const setMode = useCallback(
    (next: SpendTrendMode) => {
      void navigate({ search: (prev) => ({ ...prev, trend: next }) });
    },
    [navigate]
  );

  return { mode, setMode };
};
