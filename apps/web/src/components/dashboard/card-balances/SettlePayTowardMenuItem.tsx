import { DropdownMenuItem } from '@ploutizo/ui/components/dropdown-menu';
import { Text } from '@ploutizo/ui/components/text';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';

type SettlePayTowardMenuItemProps = {
  label: string;
  balanceCents: number;
  onSelect: () => void;
};

export const SettlePayTowardMenuItem = ({
  label,
  balanceCents,
  onSelect,
}: SettlePayTowardMenuItemProps) => (
  <DropdownMenuItem
    className="flex w-full min-w-0 cursor-pointer items-center gap-3"
    onClick={onSelect}
  >
    <Text
      variant="body-sm"
      className="min-w-0 flex-1 truncate leading-tight font-medium"
    >
      {label}
    </Text>
    <SignedBalanceText
      cents={balanceCents}
      variant="body-sm"
      className="shrink-0 font-normal"
    />
  </DropdownMenuItem>
);
