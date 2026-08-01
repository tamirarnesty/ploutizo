export { resolveWebTelemetryEnv } from './env';
export type { AppDeploymentEnv, WebTelemetryEnv } from './env';
export {
  buildPostHogInitOptions,
  buildSessionRecordingOptions,
  TELEMETRY_REPLAY_BLOCK_ATTR,
  TELEMETRY_REPLAY_BLOCK_SELECTOR,
} from './privacy';
export {
  REQUEST_ID_HEADER,
  OPERATION_ID_HEADER,
  POSTHOG_DISTINCT_ID_HEADER,
  POSTHOG_SESSION_ID_HEADER,
} from './headers';
export { createWebTelemetryClient } from './createWebTelemetryClient';
export { createLocalTelemetryClient } from './createLocalTelemetryClient';
export { createPostHogTelemetryClient } from './createPostHogTelemetryClient';
export { BrowserTelemetryRoot } from './provider';
export { TelemetryProvider, useTelemetryClient } from './context';
export { TelemetryIdentitySync, HOUSEHOLD_GROUP_TYPE } from './identity';
export { TelemetryReplayBlock } from './TelemetryReplayBlock';
export {
  addTelemetryExceptionStep,
  captureBrowserException,
  getPostHogCorrelationHeaders,
} from './exception';
export type { BrowserExceptionContext } from './exception';
export { getPostHog, initPostHog, resetPostHogForTests } from './posthogClient';
export { toPostHogLogAttributes } from './recordAttributes';
