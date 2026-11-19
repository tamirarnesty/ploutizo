import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import { PersistenceSpikeLink } from './PersistenceSpikeLink';

describe('PersistenceSpikeLink', () => {
  it('opens the persistence spike from settings', () => {
    resetRouterMocks();
    render(<PersistenceSpikeLink />);

    expect(
      screen.getByRole('link', { name: 'Persistence spike' })
    ).toHaveAttribute('href', '/persistence-spike');
  });
});
