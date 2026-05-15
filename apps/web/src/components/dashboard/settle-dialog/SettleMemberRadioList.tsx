import {
  RadioGroup,
  RadioGroupItem,
} from '@ploutizo/ui/components/radio-group';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ploutizo/ui/components/item';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { SettlementMemberRow } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

type SettleMemberRadioListProps = {
  members: SettlementMemberRow[];
  value: string;
  onValueChange: (memberId: string) => void;
};

export const SettleMemberRadioList = ({
  members,
  value,
  onValueChange,
}: SettleMemberRadioListProps) => (
  <RadioGroup
    value={value}
    onValueChange={onValueChange}
    className="flex flex-col gap-2"
  >
    {[...members]
      .sort((a, b) => b.balanceCents - a.balanceCents)
      .map((m) => {
        const isCredit = m.balanceCents < 0;
        const isSelected = value === m.member.id;
        const id = `settle-member-${m.member.id}`;
        return (
          <Item
            key={m.member.id}
            variant="outline"
            size="sm"
            // Label as root: full row clickable; shadcn Item supplies focus ring + transition.
            render={<label htmlFor={id} className="cursor-pointer" />}
            className={cn(
              'flex-nowrap',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'hover:bg-muted/50'
            )}
          >
            <RadioGroupItem value={m.member.id} id={id} className="shrink-0" />
            <ItemMedia variant="default" className="shrink-0">
              <UserAvatar
                name={m.member.name}
                imageUrl={m.member.avatarUrl}
                size="sm"
              />
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className="text-sm font-semibold">
                {m.member.name}
              </ItemTitle>
              <ItemDescription
                className={cn(
                  isCredit ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {`${formatCurrency(Math.abs(m.balanceCents))} ${isCredit ? 'credit' : 'outstanding'}`}
              </ItemDescription>
            </ItemContent>
            <ItemActions className="ms-auto shrink-0">
              <Text
                as="span"
                variant="body"
                className={cn(
                  'font-sans font-semibold tabular-nums',
                  isCredit ? 'text-success' : 'text-foreground'
                )}
              >
                {formatCurrency(Math.abs(m.balanceCents))}
              </Text>
            </ItemActions>
          </Item>
        );
      })}
  </RadioGroup>
);
