import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/transactions')({
  component: Outlet,
});
