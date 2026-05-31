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
import { Users } from 'lucide-react';
import type { SettlementAccountRow } from '@ploutizo/types';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import type { PayToward } from '@/components/dashboard/settleFormSchema';
import { UserAvatar } from '@/components/members/UserAvatar';

type SettleMemberRadioListProps = {
  account: SettlementAccountRow;
  value: PayToward;
  onValueChange: (payToward: PayToward) => void;
};

export const SettleMemberRadioList = ({
  account,
  value,
  onValueChange,
}: SettleMemberRadioListProps) => {
  const sortedMembers = [...account.members].sort((a, b) =>
    a.member.id.localeCompare(b.member.id)
  );

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as PayToward);
      }}
      className="gap-2"
    >
      {sortedMembers.map((m) => {
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
              <SignedBalanceText
                cents={m.personalBalanceCents}
                className="shrink-0 font-semibold"
              />
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
          <SignedBalanceText
            cents={account.sharedBalanceCents}
            className="shrink-0 font-semibold"
          />
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
