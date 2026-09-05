import { describe, expect, it } from 'vitest';
import type { MatchTargetFact } from '@ploutizo/types';
import {
  evaluateImportMatches,
  matchDecisionForSelectionChange,
} from './import-matches';
import type { ImportMatchDraftRow } from './import-matches';

const targetAccountId = 'account-1';

const row = (
  overrides: Partial<ImportMatchDraftRow> = {}
): ImportMatchDraftRow => ({
  id: 'row-1',
  externalId: 'visa-1001',
  reviewDate: '2026-05-02',
  parsedDate: '2026-05-02',
  reviewAmount: 4218,
  parsedAmount: 4218,
  reviewType: 'expense',
  parsedType: 'expense',
  reviewDescription: 'Coffee',
  parsedDescription: 'Coffee',
  sourceDescription: 'Coffee',
  selectedForImport: false,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  ...overrides,
});

const tx = (overrides: Partial<MatchTargetFact> = {}): MatchTargetFact => ({
  id: 'tx-1',
  accountId: targetAccountId,
  type: 'expense',
  date: '2026-05-02',
  amount: 4218,
  description: 'Coffee',
  rawDescription: 'Coffee',
  externalId: 'visa-1001',
  deleted: false,
  ...overrides,
});

const evaluate = (
  rows: ImportMatchDraftRow[],
  transactions: MatchTargetFact[]
) =>
  evaluateImportMatches(rows, {
    targetAccountId,
    existingTransactions: transactions,
  });

describe('evaluateImportMatches — exact external ID', () => {
  it('matches an active same-kind transaction on the target card by external ID', () => {
    const evaluation = evaluate([row()], [tx()]).get('row-1');

    expect(evaluation?.exactCandidate).toEqual({
      transactionId: 'tx-1',
      kind: 'external_id',
      explanation: 'Exact external ID match on this card.',
    });
    expect(evaluation?.acceptedMatch).toBeNull();
  });

  it('ignores soft-deleted transactions for external-ID duplicate protection', () => {
    const evaluation = evaluate([row()], [tx({ deleted: true })]).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.candidates).toEqual([]);
  });

  it('ignores the same external ID on a different account', () => {
    const evaluation = evaluate([row()], [tx({ accountId: 'other-card' })]).get(
      'row-1'
    );

    expect(evaluation?.exactCandidate).toBeNull();
  });

  it('treats the same external ID as an exact match even when the kind differs', () => {
    const evaluation = evaluate([row()], [tx({ type: 'refund' })]).get('row-1');

    expect(evaluation?.exactCandidate).toEqual({
      transactionId: 'tx-1',
      kind: 'external_id',
      explanation: 'Exact external ID match on this card.',
    });
  });
});

describe('evaluateImportMatches — fallback identity', () => {
  it('matches kind, date, amount, and raw description when the row has no external ID', () => {
    const evaluation = evaluate(
      [row({ externalId: null })],
      [tx({ externalId: 'kept-from-prior-import' })]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toEqual({
      transactionId: 'tx-1',
      kind: 'identity',
      explanation:
        'Exact match on type, date, amount, and original description.',
    });
  });

  it('does not use identity matching when the row has an external ID', () => {
    const evaluation = evaluate(
      [row({ sourceDescription: 'Coffee' })],
      [
        tx({
          id: 'tx-identity',
          externalId: 'different-id',
        }),
      ]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
  });

  it('compares raw description, not the reviewed description', () => {
    const evaluation = evaluate(
      [
        row({
          externalId: null,
          reviewDescription: 'Morning coffee',
          sourceDescription: 'Coffee',
        }),
      ],
      [tx({ externalId: null, rawDescription: 'Coffee' })]
    ).get('row-1');

    expect(evaluation?.exactCandidate?.kind).toBe('identity');
  });
});

describe('evaluateImportMatches — same-import collisions', () => {
  it('flags same-import external-ID collisions until exactly one row is selected', () => {
    const rows = [
      row({ id: 'row-a', selectedForImport: false }),
      row({ id: 'row-b', selectedForImport: false }),
    ];
    const evaluations = evaluate(rows, []);

    expect(evaluations.get('row-a')?.collisionRowIds).toEqual(['row-b']);
    expect(evaluations.get('row-b')?.collisionRowIds).toEqual(['row-a']);
    expect(evaluations.get('row-a')?.issues).toContain('collision');
    expect(evaluations.get('row-b')?.issues).toContain('collision');
  });

  it('blocks Continue when two colliding rows are both selected', () => {
    const rows = [
      row({ id: 'row-a', selectedForImport: true }),
      row({ id: 'row-b', selectedForImport: true }),
    ];
    const evaluations = evaluate(rows, []);

    expect(evaluations.get('row-a')?.issues).toContain('collision');
    expect(evaluations.get('row-b')?.issues).toContain('collision');
  });

  it('clears the collision once exactly one colliding row is selected', () => {
    const rows = [
      row({ id: 'row-a', selectedForImport: true }),
      row({ id: 'row-b', selectedForImport: false }),
    ];
    const evaluations = evaluate(rows, []);

    expect(evaluations.get('row-a')?.issues).not.toContain('collision');
    expect(evaluations.get('row-b')?.issues).not.toContain('collision');
  });
});

describe('evaluateImportMatches — advisory candidates', () => {
  it('keeps fuzzy description comparisons as review-only suggestions', () => {
    const evaluation = evaluate(
      [row({ externalId: null, sourceDescription: 'STARBUCKS STORE 123' })],
      [
        tx({
          externalId: null,
          rawDescription: 'STARBUCKS STORE 99',
          description: 'STARBUCKS STORE 99',
        }),
      ]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.advisoryCandidates).toEqual([
      {
        transactionId: 'tx-1',
        kind: 'fuzzy_description',
        explanation: 'Similar description on the same date and amount.',
      },
    ]);
    expect(evaluation?.acceptedMatch).toBeNull();
    expect(evaluation?.issues).toContain('advisory_unresolved');
  });

  it('keeps date-tolerant settlement comparisons as review-only suggestions', () => {
    const evaluation = evaluate(
      [
        row({
          externalId: null,
          reviewType: 'settlement',
          parsedType: 'settlement',
          reviewDate: '2026-05-08',
          parsedDate: '2026-05-08',
          sourceDescription: 'PAYMENT THANK YOU',
          reviewDescription: 'Bill Payment',
        }),
      ],
      [
        tx({
          type: 'settlement',
          date: '2026-05-02',
          externalId: null,
          rawDescription: 'PAYMENT THANK YOU',
          description: 'Bill Payment',
        }),
      ]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.advisoryCandidates).toEqual([
      {
        transactionId: 'tx-1',
        kind: 'date_tolerant',
        explanation:
          'Possible settlement match with a nearby date and the same amount.',
      },
    ]);
  });

  it('keeps near-amount comparisons as review-only suggestions', () => {
    const evaluation = evaluate(
      [row({ externalId: null, reviewAmount: 4318 })],
      [tx({ externalId: null, amount: 4218 })]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.advisoryCandidates).toEqual([
      {
        transactionId: 'tx-1',
        kind: 'near_amount',
        explanation: 'Possible match with a nearby amount on the same date.',
      },
    ]);
  });

  it('does not default advisory rows to an accepted match when selected', () => {
    const evaluation = evaluate(
      [
        row({
          externalId: null,
          selectedForImport: true,
          sourceDescription: 'STARBUCKS STORE 123',
        }),
      ],
      [
        tx({
          externalId: null,
          rawDescription: 'STARBUCKS STORE 99',
          description: 'STARBUCKS STORE 99',
        }),
      ]
    ).get('row-1');

    expect(evaluation?.acceptedMatch).toBeNull();
    expect(evaluation?.issues).toContain('advisory_unresolved');
  });

  it('treats an explicit advisory decision as an accepted match', () => {
    const evaluation = evaluate(
      [
        row({
          externalId: null,
          selectedForImport: true,
          sourceDescription: 'STARBUCKS STORE 123',
          reviewMatchedTransactionId: 'tx-1',
        }),
      ],
      [
        tx({
          externalId: null,
          rawDescription: 'STARBUCKS STORE 99',
          description: 'STARBUCKS STORE 99',
        }),
      ]
    ).get('row-1');

    expect(evaluation?.acceptedMatch).toEqual({
      transactionId: 'tx-1',
      kind: 'fuzzy_description',
    });
    expect(evaluation?.issues).not.toContain('advisory_unresolved');
  });
});

describe('evaluateImportMatches — stable decisions', () => {
  it('keeps an external-ID decision after amount changes because the bank id still matches', () => {
    const evaluation = evaluate(
      [
        row({
          selectedForImport: true,
          reviewMatchedTransactionId: 'tx-1',
          reviewAmount: 5000,
        }),
      ],
      [tx()]
    ).get('row-1');

    expect(evaluation?.exactCandidate?.kind).toBe('external_id');
    expect(evaluation?.acceptedMatch).toEqual({
      transactionId: 'tx-1',
      kind: 'external_id',
    });
    expect(evaluation?.acceptedMatchValid).toBe(true);
  });

  it('preserves a saved identity match and blocks Continue after the identity no longer holds', () => {
    const evaluation = evaluate(
      [
        row({
          externalId: null,
          selectedForImport: true,
          reviewMatchedTransactionId: 'tx-1',
          reviewAmount: 5000,
        }),
      ],
      [tx({ externalId: null })]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.acceptedMatch).toBeNull();
    expect(evaluation?.issues).toContain('invalidated_decision');
    expect(evaluation?.acceptedMatchValid).toBe(false);
  });

  it('exposes a valid accepted match for Continue when the saved target still matches exactly', () => {
    const evaluation = evaluate(
      [
        row({
          selectedForImport: true,
          reviewMatchedTransactionId: 'tx-1',
        }),
      ],
      [tx()]
    ).get('row-1');

    expect(evaluation?.acceptedMatch).toEqual({
      transactionId: 'tx-1',
      kind: 'external_id',
    });
    expect(evaluation?.acceptedMatchValid).toBe(true);
  });

  it('does not treat a dismissed exact candidate as an accepted match until selection writes it', () => {
    const evaluation = evaluate(
      [
        row({
          selectedForImport: true,
          reviewMatchDismissed: true,
        }),
      ],
      [tx()]
    ).get('row-1');

    expect(evaluation?.exactCandidate?.transactionId).toBe('tx-1');
    expect(evaluation?.acceptedMatch).toBeNull();
    expect(evaluation?.issues).toEqual([]);
  });

  it('treats multiple exact identity matches as unresolved review', () => {
    const evaluation = evaluate(
      [row({ externalId: null })],
      [
        tx({ id: 'tx-1', externalId: null }),
        tx({ id: 'tx-2', externalId: null }),
      ]
    ).get('row-1');

    expect(evaluation?.exactCandidate).toBeNull();
    expect(evaluation?.issues).toContain('ambiguous_exact');
  });
});

describe('matchDecisionForSelectionChange', () => {
  it('accepts a unique exact candidate when the row is selected', () => {
    const evaluation = evaluate([row()], [tx()]).get('row-1')!;

    expect(
      matchDecisionForSelectionChange({
        selectedForImport: true,
        currentMatchedTransactionId: null,
        exactCandidate: evaluation.exactCandidate,
      })
    ).toBe('tx-1');
  });

  it('clears the accepted match when the row is unselected', () => {
    const evaluation = evaluate([row()], [tx()]).get('row-1')!;

    expect(
      matchDecisionForSelectionChange({
        selectedForImport: false,
        currentMatchedTransactionId: 'tx-1',
        exactCandidate: evaluation.exactCandidate,
      })
    ).toBeNull();
  });

  it('keeps an existing accepted match instead of replacing it', () => {
    expect(
      matchDecisionForSelectionChange({
        selectedForImport: true,
        currentMatchedTransactionId: 'tx-saved',
        exactCandidate: {
          transactionId: 'tx-1',
          kind: 'external_id',
          explanation: 'Exact external ID match on this card.',
        },
      })
    ).toBe('tx-saved');
  });

  it('still auto-accepts an exact candidate when the row was previously dismissed', () => {
    expect(
      matchDecisionForSelectionChange({
        selectedForImport: true,
        currentMatchedTransactionId: null,
        exactCandidate: {
          transactionId: 'tx-1',
          kind: 'external_id',
          explanation: 'Exact external ID match on this card.',
        },
      })
    ).toBe('tx-1');
  });
});
