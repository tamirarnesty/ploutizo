import { describe, expect, it } from 'vitest';
import { staticCommandGroups } from './staticCommandGroups';

describe('staticCommandGroups', () => {
  it('derives command-palette destinations from the sidebar definition', () => {
    expect(staticCommandGroups.map((group) => group.heading)).toEqual([
      'Navigation',
      'Settings',
    ]);
    expect(
      staticCommandGroups.flatMap((group) => group.commands)
    ).toMatchObject([
      { to: '/dashboard' },
      { to: '/transactions' },
      { to: '/import', label: 'Import' },
      { to: '/import/history' },
      { to: '/accounts' },
      { to: '/settings' },
      { to: '/settings/categories' },
      { to: '/settings/merchant-rules' },
      { to: '/settings/household' },
    ]);
  });
});
