import { createFileRoute } from "@tanstack/react-router"
import { OrganizationProfile } from "@clerk/tanstack-react-start"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { apiFetch } from "../../lib/queryClient"

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
          <label
            htmlFor="settlement-threshold"
            className="text-sm font-medium"
          >
            Settlement reminder threshold
          </label>
          <p className="text-xs text-muted-foreground">
            You&apos;ll be reminded when the shared balance exceeds this amount.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <input
            id="settlement-threshold"
            type="number"
            min="0"
            step="0.01"
            value={thresholdDisplay}
            onChange={(e) => setThresholdDisplay(e.target.value)}
            className="w-32 h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <svg
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            Save changes
          </button>
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
