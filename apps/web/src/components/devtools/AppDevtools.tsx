import { TanStackDevtools } from '@tanstack/react-devtools';
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools';
import { hotkeysDevtoolsPlugin } from '@tanstack/react-hotkeys-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { isLoopbackHostname } from '@/lib/loopback-hostname';

export const AppDevtools = () => {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    !isLoopbackHostname(window.location.hostname)
  ) {
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
