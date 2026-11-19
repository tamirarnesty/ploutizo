/**
 * The shortcut opens a write. Refuse it while the browser is offline.
 * PLO-139 replaces this with the shared offline write gate.
 */
export const canOpenNewTransaction = () =>
  typeof navigator === 'undefined' || navigator.onLine;
