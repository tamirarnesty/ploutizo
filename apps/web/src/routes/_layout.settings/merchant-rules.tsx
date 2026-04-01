import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useMerchantRules,
  useCreateMerchantRule,
  useUpdateMerchantRule,
  useDeleteMerchantRule,
  useReorderMerchantRules,
  type MerchantRule,
} from '../../hooks/use-merchant-rules.js'
import { useCategories } from '../../hooks/use-categories.js'
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
  const [categoryId, setCategoryId] = useState<string>(rule?.categoryId ?? '')
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
      categoryId: categoryId || null,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{isEditing ? 'Edit rule' : 'Add rule'}</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium">Match type</label>
          <select
            value={matchType}
            onChange={(e) => { setMatchType(e.target.value); setIsRegexError(false) }}
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Pattern</label>
          <input
            value={pattern}
            onChange={(e) => { setPattern(e.target.value); if (isRegexError) setIsRegexError(false) }}
            onBlur={() => validateRegex(pattern)}
            placeholder={matchType === 'regex' ? '^AMAZON.*' : 'AMAZON'}
            className={[
              'w-full h-9 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50',
              isRegexError ? 'border-destructive' : 'border-input',
            ].join(' ')}
          />
          {patternError && <p className="text-xs text-destructive">{patternError}</p>}
          {isRegexError && <p className="text-xs text-destructive">Invalid regular expression.</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">
            Rename to{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
            placeholder="e.g. Amazon"
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">
            Category{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {mutationError && <p className="text-xs text-destructive">{mutationError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isRegexError}
            className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Save rule
          </button>
        </div>
      </div>
    </div>
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
        <button
          type="button"
          onClick={() => setDialogRule(null)}
          className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add rule
        </button>
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
                  <button
                    type="button"
                    onClick={() => setDialogRule(rule)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Edit
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive px-2 py-1"
                      >
                        Delete
                      </button>
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
