/**
 * Runtime bounds shaping for typed telemetry attributes.
 * Privacy is enforced at compile time via TelemetryAttributeMap; this module
 * only guards payload size and drops obvious foot-gun keys if callers bypass types.
 */

export const SHAPE_MAX_DEPTH = 4;
export const SHAPE_MAX_KEYS = 32;
export const SHAPE_MAX_ARRAY_LENGTH = 20;
export const SHAPE_MAX_STRING_LENGTH = 200;
export const SHAPE_MAX_TOTAL_BYTES = 4096;
export const SHAPE_MAX_MESSAGE_LENGTH = 200;

/** Runtime backstop — typed attributes must never include these keys. */
const HARD_BLOCKLIST = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'body',
  'headers',
  'payload',
  'raw',
  'csv',
  'content',
  'description',
  'notes',
  'name',
  'email',
  'amount',
  'balance',
  'cents',
]);

export type TelemetryAttributeValue =
  | string
  | number
  | boolean
  | null
  | TelemetryAttributeValue[]
  | { [key: string]: TelemetryAttributeValue };

export interface ShapeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maxTotalBytes?: number;
}

export interface ShapeResult {
  attributes: Record<string, TelemetryAttributeValue>;
  droppedKeys: string[];
  truncated: boolean;
}

const normalizeKey = (key: string): string => key.trim();

const isBlocklistedKey = (key: string): boolean =>
  HARD_BLOCKLIST.has(normalizeKey(key).toLowerCase());

const truncateString = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : value.slice(0, maxLength);

const estimateBytes = (value: unknown): number => {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return SHAPE_MAX_TOTAL_BYTES + 1;
  }
};

const shapeValue = (
  value: unknown,
  depth: number,
  options: Required<ShapeOptions>,
  droppedKeys: string[],
  keyPath: string
): TelemetryAttributeValue | undefined => {
  if (depth > options.maxDepth) {
    if (keyPath) {
      droppedKeys.push(keyPath);
    }
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    return truncateString(value, options.maxStringLength);
  }

  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    if (keyPath) {
      droppedKeys.push(keyPath);
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, options.maxArrayLength);
    const items = limited.flatMap((item, index) => {
      const shaped = shapeValue(
        item,
        depth + 1,
        options,
        droppedKeys,
        `${keyPath}[${index}]`
      );
      return shaped === undefined ? [] : [shaped];
    });
    if (value.length > options.maxArrayLength && keyPath) {
      droppedKeys.push(keyPath);
    }
    return items;
  }

  if (typeof value === 'object') {
    return shapeObject(
      value as Record<string, unknown>,
      depth + 1,
      options,
      droppedKeys,
      keyPath
    );
  }

  return undefined;
};

const shapeObject = (
  input: Record<string, unknown>,
  depth: number,
  options: Required<ShapeOptions>,
  droppedKeys: string[],
  keyPath: string
): Record<string, TelemetryAttributeValue> => {
  if (depth > options.maxDepth) {
    if (keyPath) {
      droppedKeys.push(keyPath);
    }
    return {};
  }

  const result: Record<string, TelemetryAttributeValue> = {};
  let keyCount = 0;

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = normalizeKey(rawKey);
    if (!key) {
      continue;
    }

    const nextPath = keyPath ? `${keyPath}.${key}` : key;

    if (isBlocklistedKey(key)) {
      droppedKeys.push(nextPath);
      continue;
    }

    if (keyCount >= options.maxKeys) {
      droppedKeys.push(nextPath);
      continue;
    }

    const shaped = shapeValue(rawValue, depth, options, droppedKeys, nextPath);
    if (shaped === undefined) {
      continue;
    }

    result[key] = shaped;
    keyCount += 1;
  }

  return result;
};

/**
 * Apply runtime bounds to typed attributes before adapter emission.
 * Never throws on malformed input.
 */
export const shapeAttributes = (
  input: unknown,
  options: ShapeOptions = {}
): ShapeResult => {
  const resolved: Required<ShapeOptions> = {
    maxDepth: options.maxDepth ?? SHAPE_MAX_DEPTH,
    maxKeys: options.maxKeys ?? SHAPE_MAX_KEYS,
    maxArrayLength: options.maxArrayLength ?? SHAPE_MAX_ARRAY_LENGTH,
    maxStringLength: options.maxStringLength ?? SHAPE_MAX_STRING_LENGTH,
    maxTotalBytes: options.maxTotalBytes ?? SHAPE_MAX_TOTAL_BYTES,
  };

  const droppedKeys: string[] = [];
  let truncated = false;

  if (input === null || input === undefined) {
    return { attributes: {}, droppedKeys, truncated };
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    const attributes: Record<string, TelemetryAttributeValue> = {};
    const shaped = shapeValue(input, 0, resolved, droppedKeys, 'value');
    if (shaped !== undefined) {
      attributes.value = shaped;
    }
    return { attributes, droppedKeys, truncated };
  }

  let attributes = shapeObject(input as Record<string, unknown>, 0, resolved, droppedKeys, '');

  if (droppedKeys.length > 0) {
    truncated = true;
  }

  if (estimateBytes(attributes) > resolved.maxTotalBytes) {
    truncated = true;
    attributes = {};
    droppedKeys.push('(payload)');
  }

  return { attributes, droppedKeys, truncated };
};

export const shapeMessage = (
  message: string,
  maxLength = SHAPE_MAX_MESSAGE_LENGTH
): string | undefined => {
  const trimmed = message.trim();
  if (!trimmed) {
    return undefined;
  }
  return truncateString(trimmed, maxLength);
};

export const isBlocklistedAttributeKey = (key: string): boolean =>
  isBlocklistedKey(key);
