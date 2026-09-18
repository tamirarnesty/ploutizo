import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { CategoriesSettings } from '@/components/settings/CategoriesSettings';
import { categoriesQueryOptions } from '@/lib/data-access/categories';
import { tagsQueryOptions } from '@/lib/data-access/tags';

export const Route = createFileRoute('/_layout/settings/categories')({
  staticData: {
    nav: {
      label: 'Categories & Tags',
      keywords: ['settings', 'categories', 'tags'],
      group: 'settings',
      sidebar: false,
      order: 1,
    },
  },
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
      context.queryClient.ensureQueryData(tagsQueryOptions()),
    ]);
  },
  component: CategoriesSettings,
});
