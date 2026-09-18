import { createFileRoute } from '@tanstack/react-router';
import { CategoriesSettings } from '@/components/settings/CategoriesSettings';

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
  component: CategoriesSettings,
});
