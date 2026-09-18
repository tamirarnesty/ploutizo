import { ACCOUNT_TYPE_VALUES } from '@ploutizo/types';
import type { AccountType } from '@ploutizo/types';

export interface AccountCreateLocationState {
  type: AccountType;
}

export const accountsRoute = {
  to: '/accounts',
} as const;

export const parseAccountCreateLocationState = (
  value: unknown
): AccountCreateLocationState | undefined => {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return undefined;
  }

  const type = value.type;
  if (
    typeof type !== 'string' ||
    !(ACCOUNT_TYPE_VALUES as readonly string[]).includes(type)
  ) {
    return undefined;
  }

  return { type: type as AccountType };
};

export const accountCreateRoute = (type: AccountType) => ({
  ...accountsRoute,
  state: { createAccount: { type } satisfies AccountCreateLocationState },
});
