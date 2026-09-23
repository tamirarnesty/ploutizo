/** Session checkbox: only explicit `true` counts as selected. */
export const isImportRowSelectedForImport = (
  selectedForImport: boolean | null | undefined
): boolean => selectedForImport === true;
