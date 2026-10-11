export const focusImportReviewRow = (rowId: string) => {
  const target = document.getElementById(`import-row-${rowId}`);
  if (!target) return;
  target.focus();
  target.scrollIntoView({ block: 'nearest' });
};
