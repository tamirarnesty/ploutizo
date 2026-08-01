import { useMemo } from 'react';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import { createNoopTelemetryClient } from '@ploutizo/telemetry';
import type { TelemetryClient } from '@ploutizo/telemetry';
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import { TelemetryProvider } from './context';
import { createWebTelemetryClient } from './createWebTelemetryClient';
import { resolveWebTelemetryEnv } from './env';
import { TelemetryIdentitySync } from './identity';
import { getPostHog, initPostHog } from './posthogClient';

const createBrowserTelemetryClient = (): TelemetryClient => {
  if (typeof window === 'undefined') {
    return createNoopTelemetryClient();
  }

  const env = resolveWebTelemetryEnv();
  const posthog = initPostHog(env);
  return createWebTelemetryClient({ env, posthog });
};

export const BrowserTelemetryRoot = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const env = useMemo(() => resolveWebTelemetryEnv(), []);
  const telemetryClient = useMemo(() => createBrowserTelemetryClient(), []);
  const posthog = getPostHog();

  const content = (
    <TelemetryProvider client={telemetryClient}>
      <TelemetryIdentitySync />
      <PostHogErrorBoundary
        additionalProperties={{
          'telemetry.operation': 'section.recover',
          'telemetry.surface': 'web.root',
          'telemetry.boundary': 'react.error',
        }}
        fallback={({ error }) => (
          <ErrorBoundary
            error={
              error instanceof Error ? error : new Error(String(error))
            }
            reset={() => {
              window.location.reload();
            }}
          />
        )}
      >
        {children}
      </PostHogErrorBoundary>
    </TelemetryProvider>
  );

  if (!env.exportEnabled || !env.posthogToken || !posthog) {
    return content;
  }

  return (
    <PostHogProvider client={posthog}>{content}</PostHogProvider>
  );
};
