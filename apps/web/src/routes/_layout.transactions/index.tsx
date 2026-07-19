import { createFileRoute } from '@tanstack/react-router';
import { validateTransactionSearch } from '../../components/transactions/transactionSearch';
import { Transactions } from '../../components/transactions/Transactions';

export const Route = createFileRoute('/_layout/transactions/')({
  validateSearch: validateTransactionSearch,
  component: Transactions,
});
