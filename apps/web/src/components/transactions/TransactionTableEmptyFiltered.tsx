import { Button } from '@ploutizo/ui/components/button'

interface TransactionsTableEmptyFilteredProps {
  onClearFilters: () => void
}

export const TransactionsTableEmptyFiltered = ({ onClearFilters }: TransactionsTableEmptyFilteredProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <p className="text-sm font-medium">No transactions match your filters</p>
    <Button variant="link" size="sm" onClick={onClearFilters}>
      Clear filters
    </Button>
  </div>
)
