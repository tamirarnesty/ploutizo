import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';

export const CardBalancesEmpty = () => (
  <Empty>
    <EmptyHeader className="gap-1">
      <EmptyTitle className="text-base font-semibold">
        No credit card accounts
      </EmptyTitle>
      <EmptyDescription className="text-xs">
        Add a credit card account to see balance breakdowns.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);
