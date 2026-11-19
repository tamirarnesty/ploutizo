import { describe, expect, it } from 'vitest';
import type { AccessState } from '@/lib/access/access-state';
import {
  browserCoordinatorName,
  browserDatabaseName,
  browserPersistenceScope,
} from './browser-database-scope';

const alexInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};

const alexInHouseholdB: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_b',
};

const blairInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_blair',
  activeHouseholdId: 'org_a',
};

describe('browserPersistenceScope', () => {
  it('names one database for a signed-in member and active household', () => {
    const scope = browserPersistenceScope(alexInHouseholdA);
    expect(scope).toEqual({
      signedInMemberId: 'user_alex',
      activeHouseholdId: 'org_a',
    });
    expect(scope && browserDatabaseName(scope)).toBe(
      'ploutizo-offline/user_alex/org_a.sqlite'
    );
    expect(scope && browserCoordinatorName(scope)).toBe(
      'ploutizo-offline/user_alex/org_a.sqlite'
    );
  });

  it('uses a different database when the active household changes', () => {
    const householdA = browserPersistenceScope(alexInHouseholdA);
    const householdB = browserPersistenceScope(alexInHouseholdB);
    expect(householdA && browserDatabaseName(householdA)).not.toBe(
      householdB && browserDatabaseName(householdB)
    );
  });

  it('uses a different database when the signed-in member changes', () => {
    const alex = browserPersistenceScope(alexInHouseholdA);
    const blair = browserPersistenceScope(blairInHouseholdA);
    expect(alex && browserDatabaseName(alex)).not.toBe(
      blair && browserDatabaseName(blair)
    );
  });

  it('keeps each member id in its own path segment', () => {
    const shorter = browserPersistenceScope({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_b',
    });
    const longer = browserPersistenceScope({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_ab',
      activeHouseholdId: 'org_b',
    });
    const shorterName = shorter && browserDatabaseName(shorter);
    const longerName = longer && browserDatabaseName(longer);
    expect(shorterName).toBe('ploutizo-offline/user_a/org_b.sqlite');
    expect(longerName).toBe('ploutizo-offline/user_ab/org_b.sqlite');
    expect(longerName?.startsWith('ploutizo-offline/user_a/')).toBe(false);
  });

  it('has no database when signed out or still onboarding', () => {
    expect(browserPersistenceScope({ status: 'signed-out' })).toBeNull();
    expect(
      browserPersistenceScope({
        status: 'signed-in-no-household',
        signedInMemberId: 'user_alex',
      })
    ).toBeNull();
  });

  it('refuses a scope id that could escape the persistence directory', () => {
    expect(
      browserPersistenceScope({
        status: 'signed-in-with-active-household',
        signedInMemberId: '../user_alex',
        activeHouseholdId: 'org_a',
      })
    ).toBeNull();
    expect(
      browserPersistenceScope({
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_alex',
        activeHouseholdId: 'org/a',
      })
    ).toBeNull();
    expect(() =>
      browserDatabaseName({
        signedInMemberId: '..',
        activeHouseholdId: 'org_a',
      })
    ).toThrow(/not safe/);
  });
});
