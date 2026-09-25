import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { useStableImportReviewTableRows } from './useStableImportReviewTableRows';

describe('useStableImportReviewTableRows', () => {
  it('returns stable object identities when row fields change', () => {
    const rowA = makeImportDraftRow({ id: 'row_a' });
    const rowB = makeImportDraftRow({ id: 'row_b', rowNumber: 3 });

    const { result, rerender } = renderHook(
      ({ rows }) => useStableImportReviewTableRows(rows),
      { initialProps: { rows: [rowA, rowB] } }
    );

    const firstStubs = result.current;
    expect(firstStubs).toEqual([{ id: 'row_a' }, { id: 'row_b' }]);

    rerender({
      rows: [
        { ...rowA, updatedAt: '2026-05-21T12:00:00.000Z' },
        { ...rowB, reviewDescription: 'Updated' },
      ],
    });

    expect(result.current[0]).toBe(firstStubs[0]);
    expect(result.current[1]).toBe(firstStubs[1]);
  });

  it('rebuilds stubs when row order changes', () => {
    const rowA = makeImportDraftRow({ id: 'row_a' });
    const rowB = makeImportDraftRow({ id: 'row_b', rowNumber: 3 });

    const { result, rerender } = renderHook(
      ({ rows }) => useStableImportReviewTableRows(rows),
      { initialProps: { rows: [rowA, rowB] } }
    );

    const firstStubs = result.current;

    rerender({ rows: [rowB, rowA] });

    expect(result.current.map((stub) => stub.id)).toEqual(['row_b', 'row_a']);
    expect(result.current[0]).not.toBe(firstStubs[0]);
  });
});
