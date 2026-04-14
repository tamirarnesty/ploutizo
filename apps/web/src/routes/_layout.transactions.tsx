import { createFileRoute } from '@tanstack/react-router'
import { transactionSearchSchema } from '../components/transactions/transactions.types'
import { Transactions } from '../components/transactions/Transactions'

export type { TransactionSearch } from '../components/transactions/transactions.types'

export const Route = createFileRoute('/_layout/transactions')({
  validateSearch: (search) => transactionSearchSchema.parse(search),
  component: Transactions,
})
