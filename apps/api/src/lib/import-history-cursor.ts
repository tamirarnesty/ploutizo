const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ImportHistoryCursor {
  closedAt: string;
  id: string;
}

export const encodeImportHistoryCursor = (closedAt: Date, id: string): string =>
  Buffer.from(`${closedAt.toISOString()}|${id}`).toString('base64url');

export const decodeImportHistoryCursor = (
  cursor: string
): ImportHistoryCursor | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    if (separator <= 0) return null;
    const closedAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!UUID_RE.test(id)) return null;
    if (Number.isNaN(Date.parse(closedAt))) return null;
    return { closedAt, id };
  } catch {
    return null;
  }
};
