import { Text } from '@ploutizo/ui/components/text';
import type { SettlementAccountRow } from '@ploutizo/types';

type CardBalancesCardCellProps = {
  account: SettlementAccountRow['account'];
};

/** Sketch 006 card column: bold name line + muted institution •••• last4 subtitle (no brand avatar tile). */
export const CardBalancesCardCell = ({
  account,
}: CardBalancesCardCellProps) => {
  const institution = account.institution?.trim();
  const last = account.lastFour?.trim();

  const metaParts: string[] = [];
  if (institution) metaParts.push(institution);
  if (last) metaParts.push(`•••• ${last}`);

  const metaLine = metaParts.length > 0 ? metaParts.join(' ') : null;

  return (
    <div className="min-w-0">
      <Text
        as="span"
        className="block truncate text-sm leading-tight font-bold"
      >
        {account.name}
      </Text>
      {metaLine !== null ? (
        <Text
          as="span"
          variant="caption"
          className="mt-0.5 block truncate leading-tight"
        >
          {metaLine}
        </Text>
      ) : null}
    </div>
  );
};
