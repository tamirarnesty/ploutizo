import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { formatSignedBalanceCents } from '@/lib/formatCurrency';

type SettlementSharedRowProps = {
  sharedRollupCents: number;
};

export const SettlementSharedRow = ({
  sharedRollupCents,
}: SettlementSharedRowProps) => {
  const sharedDisplay = formatSignedBalanceCents(sharedRollupCents);

  return (
    <Item
      variant="default"
      size="xs"
      className="w-full flex-nowrap border-0 bg-transparent p-1 shadow-none transition-colors hover:bg-muted/40"
    >
      <ItemContent className="min-w-0">
        <ItemTitle className="leading-tight">Shared</ItemTitle>
      </ItemContent>
      <ItemActions className="shrink-0">
        <Text
          as="p"
          className={cn(
            'text-right text-base leading-none font-bold whitespace-nowrap tabular-nums',
            sharedDisplay.tone === 'credit' && 'text-success',
            sharedDisplay.tone === 'zero' && 'text-muted-foreground',
            sharedDisplay.tone === 'owed' && 'text-foreground'
          )}
        >
          {sharedDisplay.text}
        </Text>
      </ItemActions>
    </Item>
  );
};
