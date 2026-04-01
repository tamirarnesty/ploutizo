import { useState, useEffect } from 'react'
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
import { Button } from '@ploutizo/ui/components/button'
import { Checkbox } from '@ploutizo/ui/components/checkbox'
import { Input } from '@ploutizo/ui/components/input'
import { Label } from '@ploutizo/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ploutizo/ui/components/select'
import { Spinner } from '@ploutizo/ui/components/spinner'
import { ToggleGroup, ToggleGroupItem } from '@ploutizo/ui/components/toggle-group'
import type { Account } from '@ploutizo/types'
import {
  useCreateAccount,
  useUpdateAccount,
  useArchiveAccount,
  useOrgMembers,
  useAccountMembers,
} from '../../hooks/use-accounts'

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
  const [selectedMemberIds, setSelectedMemberIds] = useState<Array<string>>([])
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
          <ToggleGroup
            type="single"
            value={ownership}
            onValueChange={(v) => { if (v) setOwnership(v as 'personal' | 'shared') }}
            className="w-full"
          >
            <ToggleGroupItem value="personal" className="flex-1">Personal</ToggleGroupItem>
            <ToggleGroupItem value="shared" className="flex-1">Shared</ToggleGroupItem>
          </ToggleGroup>

          {/* Account name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium" htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Joint Chequing"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Account type */}
          <div className="space-y-1">
            <Label className="text-xs font-medium" htmlFor="account-type">Account type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="account-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
          </div>

          {/* Institution */}
          <div className="space-y-1">
            <Label className="text-xs font-medium" htmlFor="account-institution">
              Institution <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="account-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. TD Bank"
            />
          </div>

          {/* Last 4 digits */}
          <div className="space-y-1">
            <Label className="text-xs font-medium" htmlFor="account-last-four">
              Last 4 digits <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="account-last-four"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              className="font-mono"
            />
          </div>

          {/* Co-owners (shared only, D-12) */}
          {ownership === 'shared' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Co-owners</Label>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other members in this household yet.</p>
              ) : (
                <div className="space-y-1">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={selectedMemberIds.includes(member.id)}
                        onCheckedChange={(checked) => {
                          setSelectedMemberIds(checked
                            ? [...selectedMemberIds, member.id]
                            : selectedMemberIds.filter((id) => id !== member.id))
                        }}
                      />
                      <Label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer">
                        {member.displayName}
                      </Label>
                    </div>
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
              <div className="flex items-start gap-2">
                <Checkbox
                  id="each-person-pays-own"
                  checked={eachPersonPaysOwn}
                  onCheckedChange={(checked) => setEachPersonPaysOwn(Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="each-person-pays-own" className="text-sm cursor-pointer">Each person pays their own</Label>
                  <p className="text-xs text-muted-foreground">
                    Excludes this account from shared settlement calculations.
                  </p>
                </div>
              </div>
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
                <Button variant="ghost" type="button" className="text-destructive hover:text-destructive">
                  Archive
                </Button>
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
            <Button variant="outline" type="button" onClick={onClose}>
              Discard
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Spinner className="mr-1" />}
              {isEditing ? 'Save changes' : 'Add account'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
