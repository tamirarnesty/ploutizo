import { Button } from '@ploutizo/ui/components/button'
import { Text } from '@ploutizo/ui/components/text'

interface TransactionsTableEmptyFilteredProps {
  onClearFilters: () => void
}

export const TransactionsTableEmptyFiltered = ({ onClearFilters }: TransactionsTableEmptyFilteredProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <Text variant="body-sm" className="font-medium">No transactions match your filters</Text>
    <Button variant="link" size="sm" onClick={onClearFilters}>
      Clear filters
    </Button>
  </div>
)
