const importDraftReviewTo = '/import/$draftId' as const;
const importDraftFinalizeTo = '/import/$draftId/finalize' as const;

export const importDraftReviewRoute = (draftId: string) => ({
  to: importDraftReviewTo,
  params: { draftId },
});

export const importDraftFinalizeRoute = (draftId: string) => ({
  to: importDraftFinalizeTo,
  params: { draftId },
});

/** Resolved pathname for import draft review (e.g. navigation blocker checks). */
export const importDraftReviewPathname = (draftId: string) =>
  importDraftReviewTo.replace('$draftId', draftId);
