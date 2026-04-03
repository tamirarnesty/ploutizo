import { createFileRoute } from "@tanstack/react-router"
import { OrganizationProfile } from "@clerk/tanstack-react-start"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { apiFetch } from "../../lib/queryClient"
import { Button } from "@ploutizo/ui/components/button"
import { Input } from "@ploutizo/ui/components/input"
import { Label } from "@ploutizo/ui/components/label"
import { Spinner } from "@ploutizo/ui/components/spinner"

// HouseholdSettings type — mirrors packages/types once plan 02-01 populates it
interface HouseholdSettings {
  settlementThreshold: number | null
}

export const Route = createFileRoute("/_layout/settings/household")({
  component: HouseholdSettingsPage,
})

function HouseholdSettingsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ["household-settings"],
    queryFn: () =>
      apiFetch<{ data: HouseholdSettings }>("/api/households/settings").then(
        (r) => r.data,
      ),
  })

  const [thresholdDisplay, setThresholdDisplay] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (data?.settlementThreshold != null) {
      setThresholdDisplay(String(data.settlementThreshold / 100))
    }
  }, [data?.settlementThreshold])

  const mutation = useMutation({
    mutationFn: (settlementThreshold: number | null) =>
      apiFetch<{ data: HouseholdSettings }>("/api/households/settings", {
        method: "PATCH",
        body: JSON.stringify({ settlementThreshold }),
      }),
    onMutate: () => {
      setIsSaving(true)
      setSaveError(null)
    },
    onSettled: () => {
      setIsSaving(false)
      void qc.invalidateQueries({ queryKey: ["household-settings"] })
    },
    onError: () =>
      setSaveError("Couldn't save changes. Check your connection and try again."),
  })

  const handleSave = () => {
    const dollars = parseFloat(thresholdDisplay)
    const cents = isNaN(dollars) ? null : Math.round(dollars * 100)
    mutation.mutate(cents)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold font-[--font-heading]">Household</h1>

      {/* Settlement threshold */}
      <section className="space-y-3">
        <div className="space-y-1">
          <Label
            htmlFor="settlement-threshold"
            className="text-sm font-medium"
          >
            Settlement reminder threshold
          </Label>
          <p className="text-xs text-muted-foreground">
            You&apos;ll be reminded when the shared balance exceeds this amount.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            id="settlement-threshold"
            type="number"
            min="0"
            step="0.01"
            value={thresholdDisplay}
            onChange={(e) => setThresholdDisplay(e.target.value)}
            className="w-32"
          />
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Spinner className="mr-1" />}
            Save changes
          </Button>
        </div>
        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
      </section>

      {/* Members & Invitations — Clerk managed */}
      <section className="space-y-3">
        <OrganizationProfile />
      </section>
    </div>
  )
}
