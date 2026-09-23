const REDERIVE_DEBOUNCE_MS = 100;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const scheduleImportDraftWorkingCopyRederive = (
  draftId: string,
  rederive: () => void
) => {
  const existing = timers.get(draftId);
  if (existing) clearTimeout(existing);
  timers.set(
    draftId,
    setTimeout(() => {
      timers.delete(draftId);
      rederive();
    }, REDERIVE_DEBOUNCE_MS)
  );
};

export const flushImportDraftWorkingCopyRederive = (draftId: string) => {
  const existing = timers.get(draftId);
  if (!existing) return;
  clearTimeout(existing);
  timers.delete(draftId);
};

export const releaseImportDraftWorkingCopyRederive = (draftId: string) => {
  flushImportDraftWorkingCopyRederive(draftId);
};

export const endImportDraftWorkingCopyRederive = () => {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
};
