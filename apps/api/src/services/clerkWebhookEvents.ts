/** Clerk webhook types handled by `dispatchWebhookEvent` — dashboard must subscribe to all of these. */
export const HANDLED_CLERK_WEBHOOK_EVENTS = [
  'organization.created',
  'organization.updated',
  'user.created',
  'user.updated',
  'organizationMembership.created',
  'organizationMembership.updated',
  'organizationMembership.deleted',
] as const;

export type HandledClerkWebhookEvent =
  (typeof HANDLED_CLERK_WEBHOOK_EVENTS)[number];
