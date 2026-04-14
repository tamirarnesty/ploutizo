// AppEnv: typed Hono context variables available after tenantGuard runs.
// Apply to every new Hono<AppEnv>() — root app and all sub-routers (except webhooksRouter).
export type AppEnv = {
  Variables: {
    orgId: string
  }
}
