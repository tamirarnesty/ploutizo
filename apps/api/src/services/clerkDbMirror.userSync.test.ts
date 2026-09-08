import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  updateLocalUserFromUserJson,
  updateOrgMemberFromMembershipJson,
} from './clerkDbMirror';
import type { OrganizationMembershipJSON, UserJSON } from '@clerk/backend';

const {
  mockOnConflictDoUpdate,
  mockInsertReturning,
  mockUpdateSet,
  mockUpdateWhere,
  mockSelect,
} = vi.hoisted(() => ({
  mockOnConflictDoUpdate: vi.fn(),
  mockInsertReturning: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
  mockSelect: vi.fn(),
}));

vi.mock('@ploutizo/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: mockUpdateSet,
    }),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  users: { id: 'users.id', externalId: 'users.externalId' },
  orgMembers: {
    userId: 'orgMembers.userId',
    orgId: 'orgMembers.orgId',
  },
}));

const chainSelect = (rows: unknown[]) => {
  const resolved = Promise.resolve(rows);
  const limit = vi.fn().mockReturnValue(resolved);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockSelect.mockReturnValue({ from });
  return { limit, where, from };
};

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

describe('updateLocalUserFromUserJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
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
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('upserts the local user and refreshes org member display names', async () => {
    await updateLocalUserFromUserJson(buildUserJson());

    expect(mockOnConflictDoUpdate).toHaveBeenCalledOnce();
    expect(mockInsertReturning).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ displayName: 'Ada Lovelace' });
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });
});

describe('updateOrgMemberFromMembershipJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    chainSelect([{ id: 'app_user_1' }]);
  });

  it('does not write when the local user row is missing', async () => {
    chainSelect([]);

    await updateOrgMemberFromMembershipJson(buildMembershipJson());

    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('updates display name and role for the household membership', async () => {
    await updateOrgMemberFromMembershipJson(
      buildMembershipJson({
        role: 'org:admin',
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

    expect(mockUpdateSet).toHaveBeenCalledWith({
      displayName: 'Alan Turing',
      role: 'admin',
    });
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });
});
