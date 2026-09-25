/** Session selection on the working copy; only an explicit true counts as selected. */
export const isImportRowSelectedForImport = (
  selectedForImport: boolean | undefined
): boolean => selectedForImport === true;
