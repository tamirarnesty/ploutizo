import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Text } from '@ploutizo/ui/components/text';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

const SettingsLayout = () => {
  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="h3">
        Settings
      </Text>
      <SettingsTabs />
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_layout/settings')({
  staticData: {
    nav: {
      label: 'Settings',
      keywords: ['preferences', 'theme'],
      group: 'settings',
      placement: 'footer',
      order: 0,
    },
  },
  component: SettingsLayout,
});
