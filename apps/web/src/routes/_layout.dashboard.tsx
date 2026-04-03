import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '../components/dashboard/Dashboard'

export const Route = createFileRoute('/_layout/dashboard')({
  component: Dashboard,
})
