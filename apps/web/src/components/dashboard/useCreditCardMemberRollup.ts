import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/types';
import { computeCreditCardMemberRollup } from '@/lib/settlements';

export type {
  HouseholdSettlementSummary,
  MemberSettlementRollup,
} from '@/lib/settlements';

export const useCreditCardMemberRollup = (
  accounts: SettlementAccountRow[] | undefined
) => useMemo(() => computeCreditCardMemberRollup(accounts), [accounts]);
