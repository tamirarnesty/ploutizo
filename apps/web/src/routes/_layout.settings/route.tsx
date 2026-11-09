import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Page } from '@ploutizo/ui/components/page';
import { PageHeader } from '@/components/PageHeader';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

const SettingsLayout = () => {
  return (
    <Page>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <Outlet />
    </Page>
  );
};

export const Route = createFileRoute('/_layout/settings')({
  staticData: {
    nav: {
      label: 'Settings',
      keywords: ['preferences', 'theme'],
      group: 'settings',
      placement: 'footer',
      searchable: false,
      order: 0,
    },
  },
  component: SettingsLayout,
});
