import { PageHeader as UiPageHeader } from '@ploutizo/ui/components/page';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import type { ComponentProps } from 'react';

/**
 * App page header: the shared `PageHeader` primitive plus ancestor
 * breadcrumbs derived automatically from the matched routes.
 */
export const PageHeader = (props: ComponentProps<typeof UiPageHeader>) => (
  <UiPageHeader breadcrumb={<PageBreadcrumbs />} {...props} />
);
