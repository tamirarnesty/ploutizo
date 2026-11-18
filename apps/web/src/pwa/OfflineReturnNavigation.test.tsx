import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouterMock } from '@/test/mockTanstackRouter';
import { OfflineReturnNavigation } from './OfflineReturnNavigation';

describe('OfflineReturnNavigation', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    useRouterMock.mockReset();
    useRouterMock.mockReturnValue({ navigate });
  });

  it('replaces the offline entry with the requested page', () => {
    window.history.replaceState(
      {},
      '',
      '/offline.html?returnTo=%2Fdashboard%3Ftab%3D1'
    );

    render(<OfflineReturnNavigation />);

    expect(navigate).toHaveBeenCalledWith({
      href: '/dashboard?tab=1',
      replace: true,
    });
  });
});
