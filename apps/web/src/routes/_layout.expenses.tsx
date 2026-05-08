import { createFileRoute } from '@tanstack/react-router';
import { Expenses } from '@/components/expenses/Expenses';

export const Route = createFileRoute('/_layout/expenses')({
  component: Expenses,
});
