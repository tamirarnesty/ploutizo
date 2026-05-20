/**
 * Maps Clerk organization membership roles to our `member_role` enum.
 * v1 DB only stores `admin`; expand this map when new app roles ship.
 */
export const mapClerkOrgRoleToAppRole = (
  clerkRole: string | null | undefined,
  context?: Record<string, unknown>
): 'admin' => {
  const r = clerkRole ?? '(missing)';
  if (r === 'org:admin' || r === 'admin') return 'admin';

  console.warn(
    '[clerkRoleMapping] Unsupported Clerk org role; using admin until role expansion',
    JSON.stringify({ clerkRole: r, ...context })
  );
  return 'admin';
};
