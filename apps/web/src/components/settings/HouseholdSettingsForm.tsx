import type { HouseholdSettingsForm as HouseholdSettingsFormType } from "@ploutizo/validators"
import { HouseholdSettingsFormSchema } from "@ploutizo/validators"
import { useAppForm } from "@ploutizo/ui/components/form"
import { Button } from "@ploutizo/ui/components/button"
import { Input } from "@ploutizo/ui/components/input"
import { Spinner } from "@ploutizo/ui/components/spinner"
import { useGetHouseholdSettings, useUpdateHouseholdSettings } from "@/lib/data-access/household"

export const HouseholdSettingsForm = () => {
  const { data } = useGetHouseholdSettings()
  const mutation = useUpdateHouseholdSettings()

  const form = useAppForm({
    defaultValues: {
      thresholdDollars: data?.settlementThreshold != null
        ? String(data.settlementThreshold / 100)
        : "",
    } satisfies HouseholdSettingsFormType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: HouseholdSettingsFormSchema as any },
    onSubmit: ({ value }) => {
      const dollars = parseFloat(value.thresholdDollars ?? "")
      const cents = isNaN(dollars) ? null : Math.round(dollars * 100)
      mutation.mutate({ settlementThreshold: cents }, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: () => (form as any).setErrorMap({ onSubmit: "Couldn't save changes. Check your connection and try again." }),
      })
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">$</span>
        <form.AppField
          name="thresholdDollars"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          validators={{ onChange: HouseholdSettingsFormSchema.shape.thresholdDollars as any }}
        >
          {(field) => (
            <>
              <Input
                id="settlement-threshold"
                type="number"
                min="0"
                step="0.01"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-32"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </>
          )}
        </form.AppField>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-1" />}
              Save changes
            </Button>
          )}
        </form.Subscribe>
      </div>
      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) => err ? <p className="text-xs text-destructive mt-2">{String(err)}</p> : null}
      </form.Subscribe>
    </form>
  )
}
