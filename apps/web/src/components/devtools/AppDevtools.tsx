import { useEffect, useState } from 'react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools';
import { hotkeysDevtoolsPlugin } from '@tanstack/react-hotkeys-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { isLoopbackHostname } from '@/lib/loopback-hostname';

export const AppDevtools = () => {
  const [enabled, setEnabled] = useState(false);

  // Mount decides the host. SSR and the phone's first paint both render nothing.
  useEffect(() => {
    if (import.meta.env.DEV && isLoopbackHostname(window.location.hostname)) {
      setEnabled(true);
    }
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <TanStackDevtools
      plugins={[
        {
          name: 'TanStack Query',
          render: <ReactQueryDevtoolsPanel />,
        },
        {
          name: 'TanStack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: 'TanStack Form',
          render: <FormDevtoolsPanel />,
        },
        hotkeysDevtoolsPlugin(),
      ]}
    />
  );
};
