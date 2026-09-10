import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/import/$draftId')({
  ssr: false,
  staticData: {
    mainContentLayout: 'viewport',
  },
  component: Outlet,
});
