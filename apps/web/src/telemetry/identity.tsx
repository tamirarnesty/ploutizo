import { useAuth, useOrganization } from '@clerk/tanstack-react-start';
import { useEffect, useRef } from 'react';
import { getPostHog } from './posthogClient';

export const HOUSEHOLD_GROUP_TYPE = 'household';

/**
 * Syncs Clerk identity and active household grouping into PostHog.
 * Must render inside ClerkProvider.
 */
export const TelemetryIdentitySync = () => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { organization } = useOrganization();
  const lastIdentityRef = useRef<string | null>(null);
  const lastHouseholdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      const posthog = getPostHog();
      if (!posthog) {
        return;
      }

      if (!isSignedIn || !userId) {
        if (lastIdentityRef.current !== null) {
          posthog.reset();
          lastIdentityRef.current = null;
          lastHouseholdRef.current = null;
        }
        return;
      }

      if (lastIdentityRef.current !== userId) {
        posthog.identify(userId);
        lastIdentityRef.current = userId;
      }

      const householdId = organization?.id ?? null;
      if (householdId) {
        if (lastHouseholdRef.current !== householdId) {
          posthog.group(HOUSEHOLD_GROUP_TYPE, householdId);
          lastHouseholdRef.current = householdId;
        }
      } else if (lastHouseholdRef.current !== null) {
        posthog.resetGroups();
        lastHouseholdRef.current = null;
      }
    } catch {
      // Telemetry must never affect product behavior.
    }
  }, [isLoaded, isSignedIn, organization?.id, userId]);

  return null;
};
