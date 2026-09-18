/** Unsigned JWT-shaped string for access/bearer tests (no signature verification). */
export const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

export const householdJwt = (memberId: string, householdId: string) =>
  unsignedJwt({ sub: memberId, org_id: householdId });
