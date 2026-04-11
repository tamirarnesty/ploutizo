import { createFileRoute } from '@tanstack/react-router'
import { OrganizationMembersSettings } from '@/components/settings/OrganizationMembersSettings'

export const Route = createFileRoute('/_layout/settings/organization-members')({
  component: OrganizationMembersSettings,
})
