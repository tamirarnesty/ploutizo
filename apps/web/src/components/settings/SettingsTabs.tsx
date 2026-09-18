import { useMemo } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger } from '@ploutizo/ui/components/tabs';
import { collectSettingsSectionNav } from '@/lib/navigation/collect-nav';
import { isAppNavRouteActive } from '@/lib/navigation/isAppNavRouteActive';

export const SettingsTabs = () => {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const tabs = useMemo(() => collectSettingsSectionNav(router), [router]);
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
