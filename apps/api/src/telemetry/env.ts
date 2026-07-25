export type AppDeploymentEnv = 'local' | 'preview' | 'production';

const APP_ENVS = new Set<AppDeploymentEnv>(['local', 'preview', 'production']);

export interface ApiTelemetryEnv {
  appEnv: AppDeploymentEnv;
  serviceName: string;
  release: string | undefined;
  posthogToken: string | undefined;
  posthogHost: string;
  /** True when OTLP exporters should be registered. */
  exportEnabled: boolean;
}

const normalizeHost = (host: string): string => host.replace(/\/+$/, '');

/**
 * Resolve deployment telemetry settings.
 * APP_ENV is authoritative — never infer from NODE_ENV.
 */
export const resolveApiTelemetryEnv = (
  env: NodeJS.ProcessEnv = process.env
): ApiTelemetryEnv => {
  const rawAppEnv = env.APP_ENV?.trim().toLowerCase();
  const appEnv: AppDeploymentEnv =
    rawAppEnv && APP_ENVS.has(rawAppEnv as AppDeploymentEnv)
      ? (rawAppEnv as AppDeploymentEnv)
      : 'local';

  const posthogToken =
    env.POSTHOG_PROJECT_TOKEN?.trim() ||
    env.POSTHOG_API_KEY?.trim() ||
    undefined;

  const posthogHost = normalizeHost(
    env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'
  );

  const release =
    env.APP_RELEASE?.trim() ||
    env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    undefined;

  const serviceName = env.OTEL_SERVICE_NAME?.trim() || 'ploutizo-api';

  return {
    appEnv,
    serviceName,
    release,
    posthogToken,
    posthogHost,
    exportEnabled: Boolean(posthogToken),
  };
};
