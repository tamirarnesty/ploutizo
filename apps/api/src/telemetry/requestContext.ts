/** Error metadata attached by error responses and read at request completion. */
export interface TelemetryErrorContext {
  code?: string;
  kind?: 'http' | 'network' | 'malformed' | 'unknown';
  escalate?: boolean;
}

/** Request-scoped telemetry context set by error responses. */
export type RequestTelemetryVariables = {
  telemetryError?: TelemetryErrorContext;
};
