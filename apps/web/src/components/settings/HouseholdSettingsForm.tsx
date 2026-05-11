import { HouseholdSettingsFormSchema } from '@ploutizo/validators';
import { useAppForm } from '@ploutizo/ui/components/form';
import { Button } from '@ploutizo/ui/components/button';
import { FieldError } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { Text } from '@ploutizo/ui/components/text';
import type { HouseholdSettingsForm as HouseholdSettingsFormType } from '@ploutizo/validators';
import {
  useGetHouseholdSettings,
  useUpdateHouseholdSettings,
} from '@/lib/data-access/household';

export const HouseholdSettingsForm = () => {
  const { data } = useGetHouseholdSettings();
  const mutation = useUpdateHouseholdSettings();

  const form = useAppForm({
    defaultValues: {
      thresholdDollars:
        data?.settlementThreshold != null
          ? String(data.settlementThreshold / 100)
          : '',
    } satisfies HouseholdSettingsFormType,
    validators: {
      onSubmit: ({ value }: { value: HouseholdSettingsFormType }) => {
        const result = HouseholdSettingsFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }) => {
      const dollars = parseFloat(value.thresholdDollars);
      const cents = isNaN(dollars) ? null : Math.round(dollars * 100);
      mutation.mutate(
        { settlementThreshold: cents },
        {
          onError: () =>
            form.setErrorMap({
              onSubmit:
                "Couldn't save changes. Check your connection and try again.",
            }),
        }
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex items-center gap-2">
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          $
        </Text>
        <form.AppField
          name="thresholdDollars"
          validators={{
            onChange: ({ value }: { value: string }) => {
              const r =
                HouseholdSettingsFormSchema.shape.thresholdDollars.safeParse(
                  value
                );
              if (!r.success)
                return r.error.issues.map((i) => i.message).join(', ');
            },
          }}
        >
          {(field) => (
            <>
              <Input
                id="settlement-threshold"
                autoComplete="off"
                type="number"
                min="0"
                step="0.01"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-32"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 ? (
                <FieldError
                  errors={field.state.meta.errors as { message?: string }[]}
                />
              ) : null}
            </>
          )}
        </form.AppField>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="mr-1" /> : null}
              Save changes
            </Button>
          )}
        </form.Subscribe>
      </div>
      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) =>
          err ? (
            <Text variant="error" className="mt-2">
              {String(err)}
            </Text>
          ) : null
        }
      </form.Subscribe>
    </form>
  );
};
