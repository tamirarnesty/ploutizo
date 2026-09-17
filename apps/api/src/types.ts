import type { RequestTelemetryVariables } from './telemetry/requestContext';

export type HouseholdPrincipal = {
  signedInMemberId: string;
  activeHouseholdId: string;
};

// AppEnv: typed Hono context variables available after middleware runs.
// Apply to every new Hono<AppEnv>() — root app and all sub-routers (except webhooksRouter).
export type AppEnv = {
  Variables: {
    principal: HouseholdPrincipal;
  } & RequestTelemetryVariables;
};
