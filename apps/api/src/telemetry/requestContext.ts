import type { TelemetryClient } from '@ploutizo/telemetry';
import type { RequestSpanHandle } from './spanHandle';

/** Error metadata attached by onError / handlers for completion classification. */
export interface TelemetryErrorContext {
  code?: string;
  kind?: 'http' | 'network' | 'malformed' | 'unknown';
  escalate?: boolean;
  message?: string;
}

export interface RequestTelemetryState {
  requestId: string;
  operationId?: string;
  client: TelemetryClient;
  span: RequestSpanHandle;
  /** PostHog correlation — telemetry only. */
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

export type RequestTelemetryVariables = {
  requestId: string;
  operationId?: string;
  telemetry: TelemetryClient;
  requestTelemetry: RequestTelemetryState;
  telemetryError?: TelemetryErrorContext;
};
