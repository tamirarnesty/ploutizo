import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  updateLocalUserFromUserJson,
  updateOrgMemberFromMembershipJson,
  userJsonToLocalUserRow,
} from './clerkDbMirror';
import type { OrganizationMembershipJSON, UserJSON } from '@clerk/backend';

const {
  mockOnConflictDoUpdate,
  mockInsertReturning,
  mockUpdateWhere,
  mockSelectWhere,
} = vi.hoisted(() => ({
  mockOnConflictDoUpdate: vi.fn(),
  mockInsertReturning: vi.fn(),
  mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
  mockSelectWhere: vi.fn(),
}));

vi.mock('@ploutizo/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: mockUpdateWhere,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockSelectWhere,
      }),
    }),
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  users: { id: 'users.id', externalId: 'users.externalId' },
  orgMembers: {
    userId: 'orgMembers.userId',
    orgId: 'orgMembers.orgId',
  },
}));

const buildUserJson = (overrides: Partial<UserJSON> = {}): UserJSON =>
  ({
    id: 'user_clerk_abc',
    first_name: 'Ada',
    last_name: 'Lovelace',
    image_url: 'https://example.com/ada.png',
    primary_email_address_id: 'email_primary',
    email_addresses: [
      {
        id: 'email_primary',
        email_address: 'ada@example.com',
      },
    ],
    ...overrides,
  }) as UserJSON;

const buildMembershipJson = (
  overrides: Partial<OrganizationMembershipJSON> = {}
): OrganizationMembershipJSON =>
  ({
    id: 'orgmem_1',
    role: 'org:admin',
    organization: { id: 'org_household', name: 'Household' },
    public_user_data: {
      user_id: 'user_clerk_abc',
      first_name: 'Ada',
      last_name: 'Lovelace',
      identifier: 'ada@example.com',
      image_url: '',
      has_image: false,
    },
    ...overrides,
  }) as OrganizationMembershipJSON;

describe('userJsonToLocalUserRow', () => {
  it('returns null when the primary email is missing', () => {
    expect(
      userJsonToLocalUserRow(
        buildUserJson({
          primary_email_address_id: 'missing',
        })
      )
    ).toBeNull();
  });
});

describe('updateLocalUserFromUserJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConflictDoUpdate.mockReturnValue({
      returning: mockInsertReturning,
    });
    mockInsertReturning.mockResolvedValue([{ id: 'app_user_1' }]);
  });

  it('writes nothing when the webhook payload has no primary email', async () => {
    await updateLocalUserFromUserJson(
      buildUserJson({ primary_email_address_id: 'missing' })
    );

    expect(mockOnConflictDoUpdate).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('upserts the local user and refreshes org member display names', async () => {
    await updateLocalUserFromUserJson(buildUserJson());

    expect(mockOnConflictDoUpdate).toHaveBeenCalledOnce();
    expect(mockInsertReturning).toHaveBeenCalledOnce();
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });
});

describe('updateOrgMemberFromMembershipJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockImplementation(() =>
      Promise.resolve([{ id: 'app_user_1' }])
    );
  });

  it('does not write when the local user row is missing', async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    await updateOrgMemberFromMembershipJson(buildMembershipJson());

    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('updates display name and role for the household membership', async () => {
    await updateOrgMemberFromMembershipJson(
      buildMembershipJson({
        role: 'org:member',
        public_user_data: {
          user_id: 'user_clerk_abc',
          first_name: 'Alan',
          last_name: 'Turing',
          identifier: 'alan@example.com',
          image_url: '',
          has_image: false,
        },
      })
    );

    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });
});
