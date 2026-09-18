import { getHouseholdBearer } from '@/lib/access/working-set';

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

// Typed API fetch helper — all API calls go through this, never raw fetch
export const apiFetch = async <T>(
  path: string,
  options?: ApiFetchOptions
): Promise<T> => {
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
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
};

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
