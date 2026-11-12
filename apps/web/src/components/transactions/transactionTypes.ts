import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Coins,
  Handshake,
  Undo2,
} from 'lucide-react';
import type { TransactionType } from '@ploutizo/types';
import type { LucideIcon } from 'lucide-react';

/** Display order for type pickers. Differs from `TRANSACTION_TYPE_VALUES`. */
export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowDownLeft },
  { value: 'income', label: 'Income', icon: ArrowUpRight },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
  { value: 'settlement', label: 'Settlement', icon: Handshake },
  { value: 'refund', label: 'Refund', icon: Undo2 },
  { value: 'contribution', label: 'Contribution', icon: Coins },
] as const satisfies readonly {
  value: TransactionType;
  label: string;
  icon: LucideIcon;
}[];
