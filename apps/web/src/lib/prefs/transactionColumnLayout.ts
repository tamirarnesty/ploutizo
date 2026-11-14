/**
 * Browser preference for the transactions table: column sequence and widths.
 * The stored value is `{ order, widths }` under
 * `ploutizo:transactions:column-layout`. A missing or unreadable value is the
 * product default. `order: null` means the definition sequence.
 */

export const TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY =
  'ploutizo:transactions:column-layout';

export const TRANSACTION_COLUMN_IDS = [
  'date',
  'type',
  'description',
  'category',
  'account',
  'assignees',
  'tags',
  'amount',
  'actions',
] as const;

export type TransactionColumnId = (typeof TRANSACTION_COLUMN_IDS)[number];

export const TRANSACTION_ACTIONS_COLUMN_ID: TransactionColumnId = 'actions';

/** Pixel sizes from the column definitions. Absent sizing state uses these. */
export const TRANSACTION_COLUMN_SIZES: Record<TransactionColumnId, number> = {
  date: 120,
  type: 140,
  description: 200,
  category: 160,
  account: 220,
  assignees: 120,
  tags: 160,
  amount: 120,
  actions: 48,
};

const MIN_COLUMN_WIDTH = 20;

export type TransactionColumnLayout = {
  order: string[] | null;
  widths: Record<string, number>;
};

export const DEFAULT_TRANSACTION_COLUMN_LAYOUT: TransactionColumnLayout = {
  order: null,
  widths: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const sameSequence = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);

export const isSameTransactionColumnOrder = (
  left: readonly string[] | null,
  right: readonly string[] | null
) => {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return sameSequence(left, right);
};

export const isSameTransactionColumnWidths = (
  left: Record<string, number>,
  right: Record<string, number>
) => {
  const leftIds = Object.keys(left);
  if (leftIds.length !== Object.keys(right).length) return false;
  return leftIds.every((id) => left[id] === right[id]);
};

const sanitizeWidths = (value: Record<string, unknown>) => {
  const widths: Record<string, number> = {};
  for (const [id, size] of Object.entries(value)) {
    if (typeof size !== 'number' || !Number.isFinite(size)) continue;
    if (size < MIN_COLUMN_WIDTH) continue;
    widths[id] = size;
  }
  return widths;
};

export const transactionColumnLayoutFromUnknown = (
  value: unknown
): TransactionColumnLayout => {
  if (!isRecord(value)) return DEFAULT_TRANSACTION_COLUMN_LAYOUT;
  const { order, widths } = value;
  if (order !== undefined && order !== null && !isStringArray(order)) {
    return DEFAULT_TRANSACTION_COLUMN_LAYOUT;
  }
  if (widths !== undefined && !isRecord(widths)) {
    return DEFAULT_TRANSACTION_COLUMN_LAYOUT;
  }
  return {
    order: order && order.length > 0 ? order : null,
    widths: sanitizeWidths(widths ?? {}),
  };
};

export const parseStoredTransactionColumnLayout = (
  raw: string | null
): TransactionColumnLayout => {
  if (raw === null || raw === '') return DEFAULT_TRANSACTION_COLUMN_LAYOUT;
  try {
    return transactionColumnLayoutFromUnknown(JSON.parse(raw));
  } catch {
    return DEFAULT_TRANSACTION_COLUMN_LAYOUT;
  }
};

/**
 * Saved ids stay in their saved sequence. Unknown ids drop out. Columns the
 * save does not mention are appended in definition order. The actions column
 * stays last.
 */
export const resolveTransactionColumnOrder = (
  stored: readonly string[] | null,
  columnIds: readonly string[]
): string[] => {
  if (stored === null) return [...columnIds];
  const known = new Set(columnIds);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of stored) {
    if (id === TRANSACTION_ACTIONS_COLUMN_ID) continue;
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of columnIds) {
    if (id === TRANSACTION_ACTIONS_COLUMN_ID || seen.has(id)) continue;
    ordered.push(id);
  }
  if (known.has(TRANSACTION_ACTIONS_COLUMN_ID)) {
    ordered.push(TRANSACTION_ACTIONS_COLUMN_ID);
  }
  return ordered;
};

/** Widths that match a column's default size are omitted so the default stays implicit. */
export const resolveTransactionColumnWidths = (
  stored: Record<string, number>,
  defaults: Record<string, number>
): Record<string, number> => {
  const widths: Record<string, number> = {};
  for (const [id, size] of Object.entries(stored)) {
    if (id === TRANSACTION_ACTIONS_COLUMN_ID) continue;
    if (!Object.hasOwn(defaults, id) || defaults[id] === size) continue;
    widths[id] = size;
  }
  return widths;
};

export const isTransactionColumnLayoutCustom = (
  order: readonly string[],
  widths: Record<string, number>,
  columnIds: readonly string[]
) => Object.keys(widths).length > 0 || !sameSequence(order, columnIds);

const arrayMove = (
  items: readonly string[],
  from: number,
  to: number
): string[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** Header drag. The actions column never moves and stays at the trailing edge. */
export const moveTransactionColumn = (
  order: readonly string[],
  activeId: string,
  overId: string
): string[] => {
  if (activeId === TRANSACTION_ACTIONS_COLUMN_ID || activeId === overId) {
    return [...order];
  }
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from < 0 || to < 0) return [...order];
  const moved = arrayMove(order, from, to).filter(
    (id) => id !== TRANSACTION_ACTIONS_COLUMN_ID
  );
  return order.includes(TRANSACTION_ACTIONS_COLUMN_ID)
    ? [...moved, TRANSACTION_ACTIONS_COLUMN_ID]
    : moved;
};
