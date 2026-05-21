import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from '@ploutizo/ui/components/field';
import {
  RadioGroup,
  RadioGroupItem,
} from '@ploutizo/ui/components/radio-group';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { Users } from 'lucide-react';
import type { SettlementAccountRow } from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatSignedBalanceCents } from '@/lib/formatCurrency';

type SettleMemberRadioListProps = {
  account: SettlementAccountRow;
  value: string;
  onValueChange: (payToward: string) => void;
};

export const SettleMemberRadioList = ({
  account,
  value,
  onValueChange,
}: SettleMemberRadioListProps) => {
  const sortedMembers = [...account.members].sort((a, b) =>
    a.member.id.localeCompare(b.member.id)
  );
  const sharedDisplay = formatSignedBalanceCents(account.sharedBalanceCents);

  return (
    <RadioGroup value={value} onValueChange={onValueChange} className="gap-2">
      {sortedMembers.map((m) => {
        const display = formatSignedBalanceCents(m.personalBalanceCents);
        const id = `settle-member-${m.member.id}`;

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
                  <FieldTitle className="min-w-0 truncate">
                    {m.member.name}
                  </FieldTitle>
                </div>
              </FieldContent>
              <Text
                as="span"
                variant="body"
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  display.tone === 'credit' ? 'text-success' : 'text-foreground'
                )}
              >
                {display.text}
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
      <FieldLabel htmlFor="settle-shared">
        <Field orientation="horizontal">
          <FieldContent className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <Users className="size-3.5" strokeWidth={2} />
              </div>
              <FieldTitle className="min-w-0 truncate">Shared</FieldTitle>
            </div>
          </FieldContent>
          <Text
            as="span"
            variant="body"
            className={cn(
              'shrink-0 font-semibold tabular-nums',
              sharedDisplay.tone === 'credit'
                ? 'text-success'
                : 'text-foreground'
            )}
          >
            {sharedDisplay.text}
          </Text>
          <RadioGroupItem
            value="shared"
            id="settle-shared"
            className="shrink-0"
          />
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
};
