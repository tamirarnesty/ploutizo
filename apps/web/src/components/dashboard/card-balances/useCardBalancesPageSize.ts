import { usePersistedPageSize } from '@/hooks/persistedPageSize';

export {
  CARD_BALANCES_PAGE_SIZE_OPTIONS,
  type CardBalancesPageSize,
} from '@/hooks/persistedPageSize';

export const useCardBalancesPageSize = () =>
  usePersistedPageSize('card-balances');
