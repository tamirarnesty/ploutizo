import { MEMBER_ROLE_VALUES } from '@ploutizo/types';
import { z } from 'zod';
import type { MemberIdentity } from '@ploutizo/types';
import { assertSchemaOutput, isoTimestampSchema } from './shared';

/** Person projection embedded in rosters (account owners, settlement rows). */
export const memberIdentitySchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  imageUrl: z.string().nullable(),
});

assertSchemaOutput<typeof memberIdentitySchema, MemberIdentity>();

/** `GET /api/households/members` row. */
export const orgMemberSchema = memberIdentitySchema.extend({
  orgId: z.string(),
  role: z.enum(MEMBER_ROLE_VALUES),
  joinedAt: isoTimestampSchema,
  /** Clerk user id (`user_…`). */
  externalId: z.string(),
});

export type OrgMember = z.infer<typeof orgMemberSchema>;

/** Statuses the invitations list requests from Clerk, and so the only ones it returns. */
export const PENDING_INVITATION_STATUS_VALUES = ['pending', 'expired'] as const;

export const pendingInvitationStatusSchema = z.enum(
  PENDING_INVITATION_STATUS_VALUES
);

export type PendingInvitationStatus = z.infer<
  typeof pendingInvitationStatusSchema
>;

/** `GET /api/households/invitations` row; ids are Clerk `orginv_…`. */
export const pendingInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: pendingInvitationStatusSchema,
  createdAt: isoTimestampSchema,
  /** Null when Clerk does not provide an expiry. */
  expiresAt: isoTimestampSchema.nullable(),
});

export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;
