import { Button } from '@ploutizo/ui/components/button'

export const TransactionsTableEmpty = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <p className="text-sm font-medium">No transactions yet</p>
    <p className="max-w-xs text-sm text-muted-foreground">
      Add your first transaction to start tracking your spending.
    </p>
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
