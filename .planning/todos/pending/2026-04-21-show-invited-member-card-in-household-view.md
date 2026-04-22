---
created: 2026-04-21T19:35:01Z
title: Show invited member card in Household view
area: ui
files: []
---

## Problem

After sending an invite via the "Invite member" form in the Household/Members view, there is no visual feedback that an invitation is pending. The member only appears in the list once they accept. This leaves the admin with no way to confirm the invite was sent or see who is pending.

## Solution

After a successful invite, render a member card in the Members list with an "Invited" badge/state (muted avatar, email as display name, "Invited" pill). Query Clerk's pending invitations (via the API) and merge them into the members list render. Card should visually differ from active members — e.g., dimmed avatar, "Invited" status label in place of role.
