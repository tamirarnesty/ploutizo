import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient.js'
import type { Account, OrgMember, AccountMember } from '@ploutizo/types'

// Accounts queries
export const useAccounts = (includeArchived = false) =>
  useQuery({
    queryKey: ['accounts', { includeArchived }],
    queryFn: () => {
      const qs = includeArchived ? '?include=archived' : ''
      return apiFetch<{ data: Account[] }>(`/api/accounts${qs}`).then((r) => r.data)
    },
  })

// Single account's members — used to pre-populate co-owners in edit mode (D-15)
// Calls GET /api/accounts/:id/members (added to accountsRouter in this plan's Task 1 Part C)
export const useAccountMembers = (accountId: string | null) =>
  useQuery({
    queryKey: ['account-members', accountId],
    queryFn: () =>
      apiFetch<{ data: AccountMember[] }>(`/api/accounts/${accountId}/members`).then((r) => r.data),
    enabled: accountId !== null,
  })

// Org members — used to populate the co-owners picker
// Calls GET /api/households/members (added to householdsRouter in this plan's Task 1 Part B)
export const useOrgMembers = () =>
  useQuery({
    queryKey: ['org-members'],
    queryFn: () => apiFetch<{ data: OrgMember[] }>('/api/households/members').then((r) => r.data),
  })

// Create account
export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      type: string
      institution?: string
      lastFour?: string
      eachPersonPaysOwn?: boolean
      memberIds?: string[]
    }) =>
      apiFetch<{ data: Account }>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

// Update account (edit form)
export const useUpdateAccount = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name?: string
      type?: string
      institution?: string | null
      lastFour?: string | null
      eachPersonPaysOwn?: boolean
      memberIds?: string[]
    }) =>
      apiFetch<{ data: Account }>(`/api/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['account-members', id] })
    },
  })
}

// Archive account
export const useArchiveAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: Account }>(`/api/accounts/${id}/archive`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
