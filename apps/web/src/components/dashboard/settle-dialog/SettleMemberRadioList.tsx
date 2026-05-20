import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@ploutizo/ui/components/field';
import {
  RadioGroup,
  RadioGroupItem,
} from '@ploutizo/ui/components/radio-group';
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
  <RadioGroup value={value} onValueChange={onValueChange} className="gap-2">
    {[...members]
      .sort((a, b) => b.balanceCents - a.balanceCents)
      .map((m) => {
        const isCredit = m.balanceCents < 0;
        const id = `settle-member-${m.member.id}`;
        const amountLabel = formatCurrency(Math.abs(m.balanceCents));

        return (
          <FieldLabel key={m.member.id} htmlFor={id}>
            <Field orientation="horizontal">
              <FieldContent className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    name={m.member.name}
                    imageUrl={m.member.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <FieldTitle>{m.member.name}</FieldTitle>
                    <FieldDescription
                      className={cn(isCredit ? 'text-success' : undefined)}
                    >
                      {`${amountLabel} ${isCredit ? 'credit' : 'outstanding'}`}
                    </FieldDescription>
                  </div>
                </div>
              </FieldContent>
              <Text
                as="span"
                variant="body"
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  isCredit ? 'text-success' : 'text-foreground'
                )}
              >
                {amountLabel}
              </Text>
              <RadioGroupItem
                value={m.member.id}
                id={id}
                className="shrink-0"
              />
            </Field>
          </FieldLabel>
        );
      })}
  </RadioGroup>
);
