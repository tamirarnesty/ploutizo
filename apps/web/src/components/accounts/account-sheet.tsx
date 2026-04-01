import { useState, useEffect } from 'react'
import type { Account } from '@ploutizo/types'
import {
  useCreateAccount,
  useUpdateAccount,
  useArchiveAccount,
  useOrgMembers,
  useAccountMembers,
} from '../../hooks/use-accounts'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@ploutizo/ui/components/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible'
import { ChevronDown } from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'chequing', label: 'Chequing' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'prepaid_cash', label: 'Prepaid / Cash' },
  { value: 'e_transfer', label: 'e-Transfer' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
] as const

interface AccountSheetProps {
  open: boolean
  account: Account | null // null = create mode
  onClose: () => void
}

export function AccountSheet({ open, account, onClose }: AccountSheetProps) {
  const isEditing = account !== null
  const { data: members = [] } = useOrgMembers()
  // Load existing co-owners for edit mode (D-15) — query is disabled when account is null
  const { data: existingMembers = [] } = useAccountMembers(account?.id ?? null)
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount(account?.id ?? '')
  const archiveAccount = useArchiveAccount()

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('chequing')
  const [institution, setInstitution] = useState('')
  const [lastFour, setLastFour] = useState('')
  const [ownership, setOwnership] = useState<'personal' | 'shared'>('personal')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [eachPersonPaysOwn, setEachPersonPaysOwn] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mutationError, setMutationError] = useState<string | null>(null)

  // Populate form when editing (D-15: derive ownership and co-owners from loaded member data)
  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setInstitution(account.institution ?? '')
      setLastFour(account.lastFour ?? '')
      setEachPersonPaysOwn(account.eachPersonPaysOwn)
      // Derive ownership and selectedMemberIds from existing account members (D-15)
      // existingMembers is populated by useAccountMembers(account.id)
      const memberIds = existingMembers.map((m) => m.memberId)
      setOwnership(memberIds.length > 0 ? 'shared' : 'personal')
      setSelectedMemberIds(memberIds)
    } else {
      setName('')
      setType('chequing')
      setInstitution('')
      setLastFour('')
      setOwnership('personal')
      setSelectedMemberIds([])
      setEachPersonPaysOwn(false)
      setAdvancedOpen(false)
    }
    setErrors({})
    setMutationError(null)
  }, [account, open, existingMembers])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Account name is required.'
    if (!type) errs.type = 'Account type is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setMutationError(null)
    const payload = {
      name: name.trim(),
      type,
      institution: institution.trim() || undefined,
      lastFour: lastFour.trim() || undefined,
      eachPersonPaysOwn,
      memberIds: ownership === 'shared' ? selectedMemberIds : [],
    }
    if (isEditing) {
      updateAccount.mutate(payload, {
        onSuccess: onClose,
        onError: () => setMutationError("Couldn't save changes. Check your connection and try again."),
      })
    } else {
      createAccount.mutate(payload, {
        onSuccess: onClose,
        onError: () => setMutationError("Couldn't save changes. Check your connection and try again."),
      })
    }
  }

  const isSaving = createAccount.isPending || updateAccount.isPending

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-[440px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>{isEditing ? 'Edit account' : 'Add account'}</SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Ownership toggle (D-12) */}
          <div className="flex rounded-md border border-border overflow-hidden text-sm">
            {(['personal', 'shared'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOwnership(o)}
                className={[
                  'flex-1 py-2 capitalize transition-colors',
                  ownership === o ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                ].join(' ')}
              >
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>

          {/* Account name */}
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="account-name">Name</label>
            <input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Joint Chequing"
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Account type */}
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="account-type">Account type</label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {ACCOUNT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          {/* Institution */}
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="account-institution">
              Institution <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="account-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. TD Bank"
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {/* Last 4 digits */}
          <div className="space-y-1">
            <label className="text-xs font-medium" htmlFor="account-last-four">
              Last 4 digits <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="account-last-four"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {/* Co-owners (shared only, D-12) */}
          {ownership === 'shared' && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Co-owners</label>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other members in this household yet.</p>
              ) : (
                <div className="space-y-1">
                  {members.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={(e) => {
                          setSelectedMemberIds(e.target.checked
                            ? [...selectedMemberIds, member.id]
                            : selectedMemberIds.filter((id) => id !== member.id))
                        }}
                        className="rounded"
                      />
                      {member.displayName}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advanced collapsible (D-13) */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              Advanced
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eachPersonPaysOwn}
                  onChange={(e) => setEachPersonPaysOwn(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div className="space-y-0.5">
                  <span className="text-sm">Each person pays their own</span>
                  <p className="text-xs text-muted-foreground">
                    Excludes this account from shared settlement calculations.
                  </p>
                </div>
              </label>
            </CollapsibleContent>
          </Collapsible>

          {mutationError && (
            <p className="text-xs text-destructive">{mutationError}</p>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border flex justify-between items-center">
          {/* Archive action (edit mode only) */}
          {isEditing && !account?.archivedAt && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="text-sm text-destructive hover:underline">
                  Archive
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Transactions linked to this account will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      archiveAccount.mutate(account!.id, { onSuccess: onClose })
                    }}
                  >
                    Archive account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-sm border border-border rounded-md hover:bg-muted"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {isEditing ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
