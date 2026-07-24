/**
 * Bounded recursive sanitization for free-form telemetry attributes.
 * Rejects credentials, tokens, raw request data, financial values,
 * entity identifiers, import contents, and user-entered text.
 */

export const SANITIZE_MAX_DEPTH = 4;
export const SANITIZE_MAX_KEYS = 32;
export const SANITIZE_MAX_ARRAY_LENGTH = 20;
export const SANITIZE_MAX_STRING_LENGTH = 200;
export const SANITIZE_MAX_TOTAL_BYTES = 4096;

export const REDACTED = '[REDACTED]' as const;
export const OMITTED = '[OMITTED]' as const;
export const TRUNCATED = '[TRUNCATED]' as const;

/** Exact key names that must never appear in telemetry attributes. */
const PROHIBITED_KEYS = new Set([
  // Credentials / tokens
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'cookies',
  'apikey',
  'api_key',
  'api-key',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'bearer',
  'credential',
  'credentials',
  'private_key',
  'privateKey',
  'client_secret',
  'clientSecret',
  'session',
  'sessionid',
  'session_id',
  'sessionId',
  'jwt',
  // Raw request / response data
  'body',
  'payload',
  'headers',
  'raw',
  'request',
  'response',
  'req',
  'res',
  'formdata',
  'formData',
  'multipart',
  // Financial values
  'amount',
  'amountcents',
  'amountCents',
  'balance',
  'balancecents',
  'balanceCents',
  'cents',
  'price',
  'cost',
  'fee',
  'currency',
  'money',
  'total',
  'subtotal',
  'percentage',
  'percent',
  'split',
  'splits',
  // Entity identifiers (use identity APIs / dedicated correlation fields instead)
  'id',
  'accountid',
  'accountId',
  'transactionid',
  'transactionId',
  'memberid',
  'memberId',
  'userid',
  'userId',
  'orgid',
  'orgId',
  'organizationid',
  'organizationId',
  'householdid',
  'householdId',
  'categoryid',
  'categoryId',
  'tagid',
  'tagId',
  'ruleid',
  'ruleId',
  'draftid',
  'draftId',
  'invitationid',
  'invitationId',
  'settlementid',
  'settlementId',
  'clerkid',
  'clerkId',
  'distinctid',
  'distinctId',
  // Import contents
  'csv',
  'rows',
  'row',
  'content',
  'contents',
  'file',
  'files',
  'upload',
  'uploads',
  'draft',
  'import',
  'imports',
  'blob',
  'buffer',
  // User-entered text
  'description',
  'notes',
  'note',
  'name',
  'title',
  'label',
  'text',
  'message',
  'email',
  'query',
  'search',
  'comment',
  'comments',
  'input',
  'value',
  'memo',
]);

/** Key substrings that indicate prohibited categories (case-insensitive). */
const PROHIBITED_KEY_SUBSTRINGS = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'api-key',
  'credential',
  'bearer',
  'privatekey',
  'private_key',
  'amount',
  'balance',
  'access_token',
  'refreshtoken',
  'clientsecret',
] as const;

/**
 * Entity-identifier keys: exact id/uuid, camelCase `*Id`/`*Uuid`, or snake `*_id`/`*_uuid`.
 * Avoid bare `endsWith('id')` so keys like `valid` / `grid` are not false positives.
 */
const isEntityIdKey = (key: string): boolean => {
  if (/^(id|ids|uuid|uuids)$/i.test(key)) {
    return true;
  }
  if (/(?:Id|Ids|Uuid|Uuids)$/.test(key)) {
    return true;
  }
  if (/_(?:id|ids|uuid|uuids)$/i.test(key)) {
    return true;
  }
  return false;
};

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  // JWT
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  // Bearer-looking tokens
  /^Bearer\s+\S+/i,
  // Long hex / base64 secrets
  /^[A-Za-z0-9+/_-]{40,}={0,2}$/,
];

export type SanitizePrimitive =
  | string
  | number
  | boolean
  | null
  | typeof REDACTED
  | typeof OMITTED
  | typeof TRUNCATED;

export type SanitizedAttributeValue =
  | SanitizePrimitive
  | SanitizedAttributeValue[]
  | { [key: string]: SanitizedAttributeValue };

export interface SanitizeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maxTotalBytes?: number;
}

export interface SanitizeResult {
  attributes: Record<string, SanitizedAttributeValue>;
  redactedKeys: string[];
  truncated: boolean;
}

const normalizeKey = (key: string): string => key.trim();

const isProhibitedKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  if (PROHIBITED_KEYS.has(normalized)) {
    return true;
  }

  const lower = normalized.toLowerCase();
  if (PROHIBITED_KEYS.has(lower)) {
    return true;
  }

  for (const substring of PROHIBITED_KEY_SUBSTRINGS) {
    if (lower.includes(substring)) {
      return true;
    }
  }

  if (isEntityIdKey(normalized)) {
    return true;
  }

  return false;
};

const looksSensitiveValue = (value: string): boolean =>
  SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value.trim()));

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}${TRUNCATED}`;
};

const estimateBytes = (value: unknown): number => {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return SANITIZE_MAX_TOTAL_BYTES + 1;
  }
};

const sanitizeValue = (
  value: unknown,
  depth: number,
  options: Required<SanitizeOptions>,
  redactedKeys: string[],
  keyPath: string
): SanitizedAttributeValue => {
  if (depth > options.maxDepth) {
    return OMITTED;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return OMITTED;
    }
    return value;
  }

  if (typeof value === 'string') {
    if (looksSensitiveValue(value)) {
      redactedKeys.push(keyPath || '(value)');
      return REDACTED;
    }
    return truncateString(value, options.maxStringLength);
  }

  if (typeof value === 'bigint') {
    return OMITTED;
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return OMITTED;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, options.maxArrayLength);
    const items = limited.map((item, index) =>
      sanitizeValue(item, depth + 1, options, redactedKeys, `${keyPath}[${index}]`)
    );
    if (value.length > options.maxArrayLength) {
      items.push(TRUNCATED);
    }
    return items;
  }

  if (typeof value === 'object') {
    return sanitizeObject(
      value as Record<string, unknown>,
      depth + 1,
      options,
      redactedKeys,
      keyPath
    );
  }

  return OMITTED;
};

const sanitizeObject = (
  input: Record<string, unknown>,
  depth: number,
  options: Required<SanitizeOptions>,
  redactedKeys: string[],
  keyPath: string
): Record<string, SanitizedAttributeValue> => {
  if (depth > options.maxDepth) {
    return { _omitted: OMITTED };
  }

  const result: Record<string, SanitizedAttributeValue> = {};
  const entries = Object.entries(input);
  let keyCount = 0;

  for (const [rawKey, rawValue] of entries) {
    if (keyCount >= options.maxKeys) {
      result._truncated = TRUNCATED;
      break;
    }

    const key = normalizeKey(rawKey);
    if (!key) {
      continue;
    }

    const nextPath = keyPath ? `${keyPath}.${key}` : key;

    if (isProhibitedKey(key)) {
      result[key] = REDACTED;
      redactedKeys.push(nextPath);
      keyCount += 1;
      continue;
    }

    result[key] = sanitizeValue(rawValue, depth, options, redactedKeys, nextPath);
    keyCount += 1;
  }

  return result;
};

/**
 * Recursively sanitize free-form attributes for telemetry emission.
 * Always returns a plain object; never throws on malformed input.
 */
export const sanitizeAttributes = (
  input: unknown,
  options: SanitizeOptions = {}
): SanitizeResult => {
  const resolved: Required<SanitizeOptions> = {
    maxDepth: options.maxDepth ?? SANITIZE_MAX_DEPTH,
    maxKeys: options.maxKeys ?? SANITIZE_MAX_KEYS,
    maxArrayLength: options.maxArrayLength ?? SANITIZE_MAX_ARRAY_LENGTH,
    maxStringLength: options.maxStringLength ?? SANITIZE_MAX_STRING_LENGTH,
    maxTotalBytes: options.maxTotalBytes ?? SANITIZE_MAX_TOTAL_BYTES,
  };

  const redactedKeys: string[] = [];
  let truncated = false;

  if (input === null || input === undefined) {
    return { attributes: {}, redactedKeys, truncated };
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    return {
      attributes: { value: sanitizeValue(input, 0, resolved, redactedKeys, 'value') },
      redactedKeys,
      truncated,
    };
  }

  let attributes = sanitizeObject(
    input as Record<string, unknown>,
    0,
    resolved,
    redactedKeys,
    ''
  );

  if (estimateBytes(attributes) > resolved.maxTotalBytes) {
    truncated = true;
    attributes = { _truncated: TRUNCATED, _reason: 'max_total_bytes' };
  }

  if ('_truncated' in attributes) {
    truncated = true;
  }

  return { attributes, redactedKeys, truncated };
};

export const isProhibitedAttributeKey = (key: string): boolean =>
  isProhibitedKey(key);
