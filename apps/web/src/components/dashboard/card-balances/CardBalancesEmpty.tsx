import { Text } from '@ploutizo/ui/components/text';

export const CardBalancesEmpty = () => (
  <div className="p-6 text-center">
    <Text variant="body" className="font-semibold">
      No credit card accounts
    </Text>
    <Text variant="caption" className="mt-1 text-muted-foreground">
      Add a credit card account to see balance breakdowns.
    </Text>
  </div>
);
