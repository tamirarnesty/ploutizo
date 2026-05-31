import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';

type SettlementSharedRowProps = {
  sharedRollupCents: number;
};

export const SettlementSharedRow = ({
  sharedRollupCents,
}: SettlementSharedRowProps) => (
  <Item
    variant="default"
    size="xs"
    className="w-full flex-nowrap border-0 bg-transparent p-1 shadow-none transition-colors hover:bg-muted/40"
  >
    <ItemContent className="min-w-0">
      <ItemTitle className="leading-tight">Shared</ItemTitle>
    </ItemContent>
    <ItemActions className="shrink-0">
      <SignedBalanceText
        as="p"
        cents={sharedRollupCents}
        className="text-right text-base leading-none font-bold"
      />
    </ItemActions>
  </Item>
);
