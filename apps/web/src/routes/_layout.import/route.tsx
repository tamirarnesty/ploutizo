import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/import')({
  staticData: {
    nav: {
      label: 'Import',
      keywords: ['import', 'upload'],
      order: 2,
    },
  },
  component: Outlet,
});
