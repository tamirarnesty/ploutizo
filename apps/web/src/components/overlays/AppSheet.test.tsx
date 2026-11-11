import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { expectOpenOverlayNamed } from '@/test/behaviour';
import { AppSheet } from './AppSheet';

describe('AppSheet', () => {
  it('exposes an accessible name when open', () => {
    render(
      <AppSheet
        open
        onOpenChange={vi.fn()}
        title="Add transaction"
        side="right"
      >
        <p>Form body</p>
      </AppSheet>
    );

    expectOpenOverlayNamed(/add transaction/i);
  });
});
