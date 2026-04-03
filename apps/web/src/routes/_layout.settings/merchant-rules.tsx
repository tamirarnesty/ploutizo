import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useMerchantRules,
  useCreateMerchantRule,
  useUpdateMerchantRule,
  useDeleteMerchantRule,
  useReorderMerchantRules,
  type MerchantRule,
} from '../../hooks/use-merchant-rules'
import { useCategories } from '../../hooks/use-categories'
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
import { GripVertical } from 'lucide-react'
import { Sortable, SortableItem, SortableItemHandle } from '@ploutizo/ui/components/reui/sortable'
import { Button } from '@ploutizo/ui/components/button'
import { Input } from '@ploutizo/ui/components/input'
import { Label } from '@ploutizo/ui/components/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@ploutizo/ui/components/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ploutizo/ui/components/dialog'

export const Route = createFileRoute('/_layout/settings/merchant-rules')({
  component: MerchantRulesPage,
})

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  regex: 'Regex',
}

function RuleDialog({
  rule,
  onClose,
}: {
  rule: MerchantRule | null
  onClose: () => void
}) {
  const isEditing = rule !== null
  const { data: categories = [] } = useCategories()
  const createRule = useCreateMerchantRule()
  const updateRule = useUpdateMerchantRule(rule?.id ?? '')

  const [pattern, setPattern] = useState(rule?.pattern ?? '')
  const [matchType, setMatchType] = useState(rule?.matchType ?? 'contains')
  const [renameTo, setRenameTo] = useState(rule?.renameTo ?? '')
  const [categoryId, setCategoryId] = useState<string>(rule?.categoryId ?? '__none__')
  const [isRegexError, setIsRegexError] = useState(false)
  const [patternError, setPatternError] = useState('')
  const [mutationError, setMutationError] = useState('')

  const validateRegex = (value: string) => {
    if (matchType !== 'regex') return
    try { new RegExp(value); setIsRegexError(false) }
    catch { setIsRegexError(true) }
  }

  const handleSave = () => {
    if (!pattern.trim()) { setPatternError('Pattern is required.'); return }
    if (isRegexError) return
    setPatternError(''); setMutationError('')
    const payload = {
      pattern: pattern.trim(),
      matchType,
      renameTo: renameTo.trim() || undefined,
      categoryId: categoryId === '__none__' ? null : categoryId,
    }
    if (isEditing) {
      updateRule.mutate(payload, {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const e = err as { error?: { code: string } }
          if (e?.error?.code === 'INVALID_REGEX') setIsRegexError(true)
          else setMutationError("Couldn't save changes. Check your connection and try again.")
        },
      })
    } else {
      createRule.mutate(payload, {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const e = err as { error?: { code: string } }
          if (e?.error?.code === 'INVALID_REGEX') setIsRegexError(true)
          else setMutationError("Couldn't save changes. Check your connection and try again.")
        },
      })
    }
  }

  const isSaving = createRule.isPending || updateRule.isPending

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit rule' : 'Add rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Match type */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Match type</Label>
            <Select value={matchType} onValueChange={(v) => { setMatchType(v); setIsRegexError(false) }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pattern */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Pattern</Label>
            <Input
              value={pattern}
              onChange={(e) => { setPattern(e.target.value); if (isRegexError) setIsRegexError(false) }}
              onBlur={() => validateRegex(pattern)}
              placeholder={matchType === 'regex' ? '^AMAZON.*' : 'AMAZON'}
              aria-invalid={isRegexError}
            />
            {patternError && <p className="text-xs text-destructive">{patternError}</p>}
            {isRegexError && <p className="text-xs text-destructive">Invalid regular expression.</p>}
          </div>

          {/* Rename to */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Rename to{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder="e.g. Amazon"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Category{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mutationError && <p className="text-xs text-destructive">{mutationError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isRegexError}>
            Save rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MerchantRulesPage() {
  const { data: rules = [], isLoading } = useMerchantRules()
  const deleteRule = useDeleteMerchantRule()
  const reorderRules = useReorderMerchantRules()
  const [dialogRule, setDialogRule] = useState<MerchantRule | null | false>(false)
  const [localRules, setLocalRules] = useState<MerchantRule[]>([])

  const displayRules = localRules.length > 0 ? localRules : rules

  const handleReorder = (newOrder: MerchantRule[]) => {
    setLocalRules(newOrder)
    reorderRules.mutate(newOrder.map((r) => r.id))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold font-[--font-heading]">Merchant Rules</h1>
        <Button type="button" onClick={() => setDialogRule(null)}>
          Add rule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : displayRules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No merchant rules</p>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Priority order</p>
            <p className="text-xs text-muted-foreground">
              Rules are applied in order. First match wins. Drag to reorder.
            </p>
          </div>
          <Sortable
            value={displayRules}
            onValueChange={handleReorder}
            getItemValue={(r) => r.id}
            strategy="vertical"
          >
            {displayRules.map((rule) => (
              <SortableItem key={rule.id} value={rule.id}>
                <div className="flex items-center gap-3 py-3 px-3 rounded-md border border-border bg-card">
                  <SortableItemHandle
                    aria-label="Drag to reorder"
                    className="cursor-grab text-muted-foreground"
                  >
                    <GripVertical size={16} />
                  </SortableItemHandle>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">
                      {MATCH_TYPE_LABELS[rule.matchType]}
                    </span>
                    <p className="text-sm font-mono truncate">{rule.pattern}</p>
                    {rule.renameTo && (
                      <p className="text-xs text-muted-foreground">
                        &rarr; {rule.renameTo}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDialogRule(rule)}
                    className="text-muted-foreground"
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This rule will no longer be applied during import.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          Delete rule
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </SortableItem>
            ))}
          </Sortable>
        </>
      )}

      {dialogRule !== false && (
        <RuleDialog rule={dialogRule} onClose={() => setDialogRule(false)} />
      )}
    </div>
  )
}
