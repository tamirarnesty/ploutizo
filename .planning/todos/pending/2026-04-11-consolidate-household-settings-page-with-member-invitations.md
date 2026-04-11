---
created: 2026-04-11T23:47:42.590Z
title: Consolidate household settings page with member invitations
area: ui
files:
  - apps/web/src/components/settings/HouseholdSettings.tsx
  - apps/web/src/components/settings/OrganizationMembersSettings.tsx
  - apps/web/src/routes/_layout.settings/route.tsx
  - apps/web/src/routes/_layout.settings/household.tsx
  - apps/web/src/routes/_layout.settings/organization-members.tsx
---

## Problem

Currently the settings page has two separate tabs — "Household" (settlement threshold) and "Members" (member list). These are closely related and splitting them across tabs creates unnecessary navigation friction. There is also no way to invite new members to the household.

## Solution

1. Remove the "Members" tab from the settings layout — delete `/settings/organization-members` route and `OrganizationMembersSettings` component (or fold content into HouseholdSettings)
2. Expand the single "Household" tab/page into sections:
   - Household overview (org name, image — now available via `orgs.name` and `orgs.image_url`)
   - Members list (currently in OrganizationMembersSettings — move inline)
   - Invite member form — use `useOrganization().inviteMember({ emailAddress, role: "org:admin" })` from `@clerk/tanstack-react-start`, no backend changes needed
   - Settlement threshold (already in HouseholdSettingsForm)
3. Update `settingsTabs` in `route.tsx` to remove the Members entry
4. The `useGetOrgMembers` hook and API endpoint (`/api/households/members`) stay as-is
