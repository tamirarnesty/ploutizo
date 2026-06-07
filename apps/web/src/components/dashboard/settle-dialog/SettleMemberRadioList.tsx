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
import type { ReactNode } from 'react';

type SettleMemberRadioListProps = {
  account: SettlementAccountRow;
  value: PayToward;
  onValueChange: (payToward: PayToward) => void;
};

type SettleMemberRadioRowProps = {
  value: PayToward;
  title: string;
  balanceCents: number;
  leading: ReactNode;
};

const settleRowInputId = (payToward: PayToward) =>
  payToward === 'shared' ? 'settle-shared' : `settle-member-${payToward}`;

const SettleMemberRadioRow = ({
  value,
  title,
  balanceCents,
  leading,
}: SettleMemberRadioRowProps) => {
  const id = settleRowInputId(value);

  return (
    <FieldLabel htmlFor={id}>
      {/* Override Field horizontal defaults (items-start + radio mt-px). */}
      <Field
        orientation="horizontal"
        className="items-center has-[>[data-slot=field-content]]:items-center [&>[role=radio]]:mt-0"
      >
        <RadioGroupItem value={value} id={id} className="shrink-0" />
        <FieldContent className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {leading}
            <FieldTitle className="min-w-0 truncate">{title}</FieldTitle>
          </div>
        </FieldContent>
        <SignedBalanceText
          cents={balanceCents}
          className="shrink-0 font-semibold"
        />
      </Field>
    </FieldLabel>
  );
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
      {sortedMembers.map((m) => (
        <SettleMemberRadioRow
          key={m.member.id}
          value={m.member.id}
          title={m.member.name}
          balanceCents={m.personalBalanceCents}
          leading={
            <UserAvatar
              name={m.member.name}
              imageUrl={m.member.avatarUrl}
              size="sm"
            />
          }
        />
      ))}
      <SettleMemberRadioRow
        value="shared"
        title="Shared"
        balanceCents={account.sharedBalanceCents}
        leading={
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Users className="size-3.5" strokeWidth={2} />
          </div>
        }
      />
    </RadioGroup>
  );
};
