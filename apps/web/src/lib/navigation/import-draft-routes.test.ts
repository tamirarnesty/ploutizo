import { describe, expect, it } from 'vitest';

import {
  importDraftFinalizeRoute,
  importDraftReviewPathname,
  importDraftReviewRoute,
} from './import-draft-routes';

describe('importDraftReviewRoute', () => {
  it('returns typed review navigation options', () => {
    expect(importDraftReviewRoute('draft_1')).toEqual({
      to: '/import/$draftId',
      params: { draftId: 'draft_1' },
    });
  });
});

describe('importDraftFinalizeRoute', () => {
  it('returns typed finalize navigation options', () => {
    expect(importDraftFinalizeRoute('draft_1')).toEqual({
      to: '/import/$draftId/finalize',
      params: { draftId: 'draft_1' },
    });
  });
});

describe('importDraftReviewPathname', () => {
  it('resolves the review pathname for blocker checks', () => {
    expect(importDraftReviewPathname('draft_1')).toBe('/import/draft_1');
  });
});
