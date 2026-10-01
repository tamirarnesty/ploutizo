import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/validators';
import { computeCreditCardMemberRollup } from '@/lib/settlements';

export const useCreditCardMemberRollup = (
  accounts: SettlementAccountRow[] | undefined
) => useMemo(() => computeCreditCardMemberRollup(accounts), [accounts]);
