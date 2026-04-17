import { useState } from "react"
import { Sortable } from "@ploutizo/ui/components/reui/sortable"
import { Button } from "@ploutizo/ui/components/button"
import { Skeleton } from "@ploutizo/ui/components/skeleton"
import { Text } from "@ploutizo/ui/components/text"
import { RuleDialog } from "./RuleDialog"
import { MerchantRuleRow } from "./MerchantRuleRow"
import type { MerchantRule } from "@/lib/data-access/merchant-rules"
import {
  useDeleteMerchantRule,
  useGetMerchantRules,
  useReorderMerchantRules,
} from "@/lib/data-access/merchant-rules"

export const MerchantRulesSettings = () => {
  const { data: rules = [], isLoading } = useGetMerchantRules()
  const deleteRule = useDeleteMerchantRule()
  const reorderRules = useReorderMerchantRules()
  const [dialogRule, setDialogRule] = useState<MerchantRule | null | false>(
    false
  )
  const [localRules, setLocalRules] = useState<MerchantRule[]>([])

  const displayRules = localRules.length > 0 ? localRules : rules

  const handleReorder = (newOrder: MerchantRule[]) => {
    setLocalRules(newOrder)
    reorderRules.mutate(newOrder.map((r) => r.id))
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="h3">Merchant Rules</Text>
        <Button type="button" onClick={() => setDialogRule(null)}>
          Add rule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : displayRules.length === 0 ? (
        <Text variant="body-sm" className="text-muted-foreground">No merchant rules</Text>
      ) : (
        <>
          <div className="space-y-1">
            <Text variant="caption" className="font-medium">
              Priority order
            </Text>
            <Text variant="caption">
              Rules are applied in order. First match wins. Drag to reorder.
            </Text>
          </div>
          <Sortable
            value={displayRules}
            onValueChange={handleReorder}
            getItemValue={(r) => r.id}
            strategy="vertical"
            className="space-y-2"
          >
            {displayRules.map((rule) => (
              <MerchantRuleRow
                key={rule.id}
                rule={rule}
                onEdit={() => setDialogRule(rule)}
                onDelete={() => deleteRule.mutate(rule.id)}
              />
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
