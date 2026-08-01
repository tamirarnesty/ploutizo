export type AppDeploymentEnv = 'local' | 'preview' | 'production';

const APP_ENVS = new Set<AppDeploymentEnv>(['local', 'preview', 'production']);

export interface WebTelemetryEnv {
  appEnv: AppDeploymentEnv;
  serviceName: string;
  release: string | undefined;
  posthogToken: string | undefined;
  posthogHost: string;
  /** True when PostHog export should be enabled. */
  exportEnabled: boolean;
  /** True only when VITE_APP_ENV is explicitly `local`. */
  mirrorConsole: boolean;
}

const normalizeHost = (host: string): string => host.replace(/\/+$/, '');

const readViteEnv = (
  env: ImportMetaEnv
): {
  rawAppEnv: string | undefined;
  posthogToken: string | undefined;
  posthogHost: string;
  release: string | undefined;
} => {
  const rawAppEnv = env.VITE_APP_ENV?.trim().toLowerCase();
  const posthogToken =
    env.VITE_POSTHOG_PROJECT_TOKEN?.trim() ||
    env.VITE_POSTHOG_API_KEY?.trim() ||
    undefined;
  const posthogHost = normalizeHost(
    env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'
  );
  const release =
    env.VITE_APP_RELEASE?.trim() ||
    env.VITE_RAILWAY_GIT_COMMIT_SHA?.trim() ||
    undefined;

  return { rawAppEnv, posthogToken, posthogHost, release };
};

/**
 * Resolve browser telemetry settings from Vite env.
 * VITE_APP_ENV is authoritative when set — never infer the deployment label from NODE_ENV.
 */
export const resolveWebTelemetryEnv = (
  env: ImportMetaEnv = import.meta.env
): WebTelemetryEnv => {
  const { rawAppEnv, posthogToken, posthogHost, release } = readViteEnv(env);

  const explicitAppEnv =
    rawAppEnv && APP_ENVS.has(rawAppEnv as AppDeploymentEnv)
      ? (rawAppEnv as AppDeploymentEnv)
      : undefined;

  const appEnv: AppDeploymentEnv =
    explicitAppEnv ?? (posthogToken ? 'preview' : 'local');

  const serviceName = env.VITE_OTEL_SERVICE_NAME?.trim() || 'ploutizo-web';

  return {
    appEnv,
    serviceName,
    release,
    posthogToken,
    posthogHost,
    exportEnabled: Boolean(posthogToken),
    mirrorConsole: explicitAppEnv === 'local',
  };
};
