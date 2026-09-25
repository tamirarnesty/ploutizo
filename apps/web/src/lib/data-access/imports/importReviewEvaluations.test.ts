import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import {
  endImportReviewEvaluations,
  getImportReviewRowEvaluation,
  publishImportReviewEvaluations,
  subscribeImportReviewEvaluations,
} from './importReviewEvaluations';

const evaluation = (
  overrides: Partial<ImportDraftRowEvaluation> = {}
): ImportDraftRowEvaluation => ({
  status: 'ready',
  blockers: [],
  invalidReason: null,
  refundLink: null,
  refundSuggestion: null,
  match: null,
  ...overrides,
});

describe('importReviewEvaluations', () => {
  afterEach(() => {
    endImportReviewEvaluations();
  });

  it('reuses stable evaluation object references when unchanged', () => {
    const draftId = 'draft_1';
    const first = new Map([
      ['row_a', evaluation({ status: 'ready' })],
    ] as const);
    publishImportReviewEvaluations(draftId, first);

    const stable = getImportReviewRowEvaluation(draftId, 'row_a');
    const second = new Map([
      ['row_a', evaluation({ status: 'ready' })],
    ] as const);
    publishImportReviewEvaluations(draftId, second);

    expect(getImportReviewRowEvaluation(draftId, 'row_a')).toBe(stable);
  });

  it('notifies subscribers when a row evaluation changes', () => {
    const draftId = 'draft_1';
    const listener = vi.fn();
    const unsubscribe = subscribeImportReviewEvaluations(draftId, listener);

    publishImportReviewEvaluations(
      draftId,
      new Map([['row_a', evaluation({ status: 'ready' })]])
    );
    publishImportReviewEvaluations(
      draftId,
      new Map([['row_a', evaluation({ status: 'needs_review' })]])
    );

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('reuses the prior evaluation when nested match data is unchanged', () => {
    const draftId = 'draft_1';
    const match = {
      candidates: [],
      exactCandidate: null,
      advisoryCandidates: [],
      collisionRowIds: [],
      acceptedMatch: null,
      acceptedMatchValid: true,
      issues: ['advisory_unresolved' as const],
    };
    publishImportReviewEvaluations(
      draftId,
      new Map([['row_a', evaluation({ match })]])
    );
    const stable = getImportReviewRowEvaluation(draftId, 'row_a');

    publishImportReviewEvaluations(
      draftId,
      new Map([
        [
          'row_a',
          evaluation({
            match: { ...match, issues: ['advisory_unresolved'] },
          }),
        ],
      ])
    );

    expect(getImportReviewRowEvaluation(draftId, 'row_a')).toBe(stable);
  });

  it('replaces the evaluation when a nested match issue changes', () => {
    const draftId = 'draft_1';
    const match = {
      candidates: [],
      exactCandidate: null,
      advisoryCandidates: [],
      collisionRowIds: [],
      acceptedMatch: null,
      acceptedMatchValid: true,
      issues: ['advisory_unresolved' as const],
    };
    publishImportReviewEvaluations(
      draftId,
      new Map([['row_a', evaluation({ match })]])
    );

    publishImportReviewEvaluations(
      draftId,
      new Map([
        [
          'row_a',
          evaluation({
            match: { ...match, issues: ['collision'] },
          }),
        ],
      ])
    );

    expect(
      getImportReviewRowEvaluation(draftId, 'row_a')?.match?.issues
    ).toEqual(['collision']);
  });
});
