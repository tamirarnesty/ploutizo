import { Button } from '@ploutizo/ui/components/button'
import { Text } from '@ploutizo/ui/components/text'

export const TransactionsTableEmpty = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <Text variant="body-sm" className="font-medium">No transactions yet</Text>
    <Text variant="body-sm" className="max-w-xs text-muted-foreground">
      Add your first transaction to start tracking your spending.
    </Text>
    <Button
      type="button"
      disabled
      aria-disabled="true"
      title="Create transactions coming soon"
      className="mt-2"
    >
      Add transaction
    </Button>
  </div>
)
