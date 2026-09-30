import type { HttpMethod } from '@ploutizo/telemetry';
import { getHouseholdBearer } from '@/lib/access/working-set';
import type { z } from 'zod';

// API base URL from env var — never hardcode ploutizo.app or localhost
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export type ApiFetchOptions = RequestInit & {
  signal?: AbortSignal;
};

export const createHouseholdBearerUnavailableError = () => {
  const error = new Error('Household bearer unavailable');
  error.name = 'HouseholdBearerUnavailableError';
  return error;
};

/**
 * A success response whose body does not match its schema. Deterministic, so it is never retried, and
 * `kind: 'malformed'` classifies it as reportable under ADR 0006. `path` and `issues` are diagnostics for
 * error tracking only: the path carries entity ids and the issue paths can carry record keys, so neither
 * belongs in the message, telemetry attributes, or UI.
 */
export class ApiResponseContractError extends Error {
  readonly kind = 'malformed';
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  readonly issues: z.core.$ZodIssue[];

  constructor(input: {
    method: HttpMethod;
    path: string;
    status: number;
    issues: z.core.$ZodIssue[];
  }) {
    super('API response did not match its contract');
    this.name = 'ApiResponseContractError';
    this.method = input.method;
    this.path = input.path;
    this.status = input.status;
    this.issues = input.issues;
  }
}

const requestMethod = (options?: ApiFetchOptions): HttpMethod =>
  (options?.method?.toUpperCase() ?? 'GET') as HttpMethod;

/** Sends an authorised request; a non-OK response throws its parsed error body. */
const request = async (
  path: string,
  options?: ApiFetchOptions
): Promise<Response> => {
  const token = await getHouseholdBearer();
  if (!token) {
    throw createHouseholdBearerUnavailableError();
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw error;
  }
  return res;
};

/**
 * Fetches a response body and returns it parsed by `schema` — every API read goes through this, never raw
 * fetch. A body that fails the schema throws {@link ApiResponseContractError}.
 */
export const apiFetch = async <TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options?: ApiFetchOptions
): Promise<z.output<TSchema>> => {
  const res = await request(path, options);
  const body: unknown =
    res.status === 204 ? undefined : await res.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiResponseContractError({
      method: requestMethod(options),
      path,
      status: res.status,
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
};

/** Sends a request whose response body the caller does not use (including 204). */
export const apiSend = async (
  path: string,
  options?: ApiFetchOptions
): Promise<void> => {
  await request(path, options);
};

/** Query retry policy: one retry, except contract failures, which would fail the same way again. */
export const shouldRetryApiRequest = (
  failureCount: number,
  error: unknown
): boolean => !(error instanceof ApiResponseContractError) && failureCount < 1;

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    errors?: { message?: string }[];
  };
}

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeError = error as ApiErrorBody;
  return maybeError.error?.code;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Couldn't process that request."
): string => {
  // The contract message is a developer diagnostic; users get the caller's generic copy.
  if (error instanceof ApiResponseContractError) return fallback;

  const nativeMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : undefined;

  const maybeError = error as ApiErrorBody;
  return (
    nativeMessage ??
    maybeError.error?.message ??
    maybeError.error?.errors?.[0]?.message ??
    fallback
  );
};
