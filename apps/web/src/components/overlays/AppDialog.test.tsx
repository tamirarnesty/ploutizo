import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { expectOpenOverlayNamed } from '@/test/behaviour';
import { AppDialog } from './AppDialog';

describe('AppDialog', () => {
  it('exposes an accessible name when open', () => {
    render(
      <AppDialog open onOpenChange={vi.fn()} title="CSV import guide">
        <p>Guide body</p>
      </AppDialog>
    );

    expectOpenOverlayNamed(/csv import guide/i);
  });
});
