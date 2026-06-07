import { Text } from '@ploutizo/ui/components/text';
import {
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import { RightAlignedCell } from '@/components/dashboard/card-balances/RightAlignedColumnHeader';

export type CardBalancesGridFooterProps = {
  balanceTotalCents: number;
};

export const CardBalancesGridFooter = ({
  balanceTotalCents,
}: CardBalancesGridFooterProps) => (
  <DataGridTableFootRow>
    <DataGridTableFootRowCell colSpan={2}>
      <Text variant="caption">Total outstanding</Text>
    </DataGridTableFootRowCell>
    <DataGridTableFootRowCell>
      <RightAlignedCell>
        <SignedBalanceText
          cents={balanceTotalCents}
          className="text-sm font-semibold"
        />
      </RightAlignedCell>
    </DataGridTableFootRowCell>
    <DataGridTableFootRowCell colSpan={4} />
  </DataGridTableFootRow>
);
