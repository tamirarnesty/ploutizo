export const parseImportAssigneeHints = (value: string): string[] =>
  value
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean);
