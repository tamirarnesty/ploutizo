import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { Text } from '@ploutizo/ui/components/text';
import { normalizePathname } from '@/lib/navigation/normalizePathname';

const SettingsLayout = () => {
  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="h3">
        Settings
      </Text>
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_layout/settings')({
  component: SettingsLayout,
  beforeLoad: ({ location }) => {
    if (normalizePathname(location.pathname) === '/settings') {
      throw redirect({ to: '/settings/categories' });
    }
  },
});
