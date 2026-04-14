import { createFileRoute } from '@tanstack/react-router'
import { transactionSearchSchema } from '../components/transactions/transactionSearch'
import { Transactions } from '../components/transactions/Transactions'

export type { TransactionSearch } from '../components/transactions/transactionSearch'

export const Route = createFileRoute('/_layout/transactions')({
  validateSearch: (search) => transactionSearchSchema.parse(search),
  component: Transactions,
})
