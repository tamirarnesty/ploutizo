import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteOrgMemberIfPresent,
  insertLocalUserIfAbsent,
  insertOrgMemberIfAbsent,
  updateLocalUserFromUserJson,
} from './clerkDbMirror';
import { dispatchWebhookEvent, handleOrgMembershipDeleted } from './webhooks';
import type { OrganizationMembershipJSON, WebhookEvent } from '@clerk/backend';

vi.mock('./clerkDbMirror', () => ({
  buildOrgMemberDisplayName: vi.fn(() => 'Ada Lovelace'),
  deleteOrgMemberIfPresent: vi.fn(),
  insertLocalUserIfAbsent: vi.fn(),
  insertOrgMemberIfAbsent: vi.fn(),
  updateLocalUserFromUserJson: vi.fn(),
  userJsonToLocalUserRow: vi.fn(),
}));

const membershipPayload = (): OrganizationMembershipJSON =>
  ({
    id: 'orgmem_1',
    object: 'organization_membership',
    organization: {
      id: 'org_1',
      name: 'Household',
      slug: 'household',
      object: 'organization',
      created_at: 1,
      updated_at: 1,
      public_metadata: {},
      private_metadata: {},
      max_allowed_memberships: 0,
      admin_delete_enabled: true,
      members_count: 2,
      pending_invitations_count: 0,
      has_image: false,
      image_url: '',
    },
    public_user_data: {
      user_id: 'user_removed',
      first_name: 'Ada',
      last_name: 'Lovelace',
      image_url: '',
      has_image: false,
      identifier: 'ada@example.com',
    },
    role: 'org:member',
    role_name: 'Member',
    permissions: [],
    public_metadata: {},
    created_at: 1,
    updated_at: 1,
  }) as unknown as OrganizationMembershipJSON;

describe('handleOrgMembershipDeleted', () => {
  beforeEach(() => {
    vi.mocked(deleteOrgMemberIfPresent).mockReset();
  });

  it('deletes the local org member for the Clerk org and user', async () => {
    await handleOrgMembershipDeleted(membershipPayload());
    expect(deleteOrgMemberIfPresent).toHaveBeenCalledWith({
      orgId: 'org_1',
      clerkUserId: 'user_removed',
    });
  });
});

describe('dispatchWebhookEvent', () => {
  beforeEach(() => {
    vi.mocked(deleteOrgMemberIfPresent).mockReset();
    vi.mocked(insertLocalUserIfAbsent).mockReset();
    vi.mocked(insertOrgMemberIfAbsent).mockReset();
    vi.mocked(updateLocalUserFromUserJson).mockReset();
  });

  it('routes organizationMembership.deleted to the membership delete handler', async () => {
    const event = {
      type: 'organizationMembership.deleted',
      data: membershipPayload(),
    } as WebhookEvent;
    await dispatchWebhookEvent(event);
    expect(deleteOrgMemberIfPresent).toHaveBeenCalledWith({
      orgId: 'org_1',
      clerkUserId: 'user_removed',
    });
  });

  it('is a no-op for duplicate organizationMembership.deleted deliveries', async () => {
    const event = {
      type: 'organizationMembership.deleted',
      data: membershipPayload(),
    } as WebhookEvent;
    await dispatchWebhookEvent(event);
    await dispatchWebhookEvent(event);
    expect(deleteOrgMemberIfPresent).toHaveBeenCalledTimes(2);
  });

  it('does not handle user.deleted or organization.deleted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await dispatchWebhookEvent({
      type: 'user.deleted',
      data: { id: 'user_1', object: 'user', deleted: true },
    } as WebhookEvent);
    await dispatchWebhookEvent({
      type: 'organization.deleted',
      data: { id: 'org_1', object: 'organization', deleted: true },
    } as WebhookEvent);
    expect(deleteOrgMemberIfPresent).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
