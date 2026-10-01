import { describe, expect, it } from 'vitest';
import {
  importFinalizePendingMessage,
  importFinalizeToastId,
} from './importFinalizeToast';

describe('importFinalizeToast', () => {
  it('keys loading toasts by draft id', () => {
    expect(importFinalizeToastId('draft_abc')).toBe(
      'import-finalize:draft_abc'
    );
  });

  it('describes created rows with singular and plural copy', () => {
    expect(
      importFinalizePendingMessage({
        created: 1,
        matched: 0,
        skipped: 0,
        invalid: 0,
      })
    ).toBe('Importing 1 transaction…');
    expect(
      importFinalizePendingMessage({
        created: 214,
        matched: 0,
        skipped: 0,
        invalid: 0,
      })
    ).toBe('Importing 214 transactions…');
  });

  it('describes matched-only finalize copy', () => {
    expect(
      importFinalizePendingMessage({
        created: 0,
        matched: 1,
        skipped: 0,
        invalid: 0,
      })
    ).toBe('Linking 1 matched transaction…');
    expect(
      importFinalizePendingMessage({
        created: 0,
        matched: 12,
        skipped: 0,
        invalid: 0,
      })
    ).toBe('Linking 12 matched transactions…');
  });

  it('falls back when nothing will be created or linked', () => {
    expect(
      importFinalizePendingMessage({
        created: 0,
        matched: 0,
        skipped: 3,
        invalid: 1,
      })
    ).toBe('Finalizing import…');
  });
});
