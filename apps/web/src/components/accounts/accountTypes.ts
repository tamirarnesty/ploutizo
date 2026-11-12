import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import type { AccountType } from '@ploutizo/types';
import type { LucideIcon } from 'lucide-react';

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'chequing', label: 'Chequing', icon: Landmark },
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'prepaid_cash', label: 'Prepaid / Cash', icon: Banknote },
  { value: 'e_transfer', label: 'e-Transfer', icon: ArrowLeftRight },
  { value: 'investment', label: 'Investment', icon: TrendingUp },
] as const satisfies readonly {
  value: AccountType;
  label: string;
  icon: LucideIcon;
}[];

export const getAccountTypeLabel = (type: string): string =>
  ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
