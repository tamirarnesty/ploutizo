import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger } from '@ploutizo/ui/components/tabs';
import { collectSectionNav } from '@/lib/navigation/collect-nav';
import { isAppNavRouteActive } from '@/lib/navigation/isAppNavRouteActive';
import { settingsLayoutRouteId } from '@/routes/_layout.settings/nav';

export const SettingsTabs = () => {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const tabs = collectSectionNav(router, settingsLayoutRouteId);
  const activeTab =
    tabs.find((tab) => isAppNavRouteActive(pathname, tab.to))?.to ??
    tabs[0]?.to;

  return (
    <Tabs value={activeTab}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.to}
            value={tab.to}
            nativeButton={false}
            render={<Link to={tab.to} preload="intent" />}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
