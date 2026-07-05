export const parseImportTags = (value: string): string[] =>
  value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
