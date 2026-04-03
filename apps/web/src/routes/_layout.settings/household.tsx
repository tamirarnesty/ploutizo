import { createFileRoute } from '@tanstack/react-router'
import { HouseholdSettings } from '@/components/settings/HouseholdSettings'

export const Route = createFileRoute('/_layout/settings/household')({
  component: HouseholdSettings,
})
