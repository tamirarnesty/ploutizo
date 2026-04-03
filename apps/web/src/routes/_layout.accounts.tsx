import { createFileRoute } from '@tanstack/react-router'
import { Accounts } from '../components/accounts/Accounts'

export const Route = createFileRoute('/_layout/accounts')({
  component: Accounts,
})
