import { HouseholdSettingsFormSchema } from '@ploutizo/validators';
import { useAppForm } from '@ploutizo/ui/components/form';
import { FieldError } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { parseCurrencyInput } from '@ploutizo/utils/currency';
import type { HouseholdSettingsForm as HouseholdSettingsFormType } from '@ploutizo/validators';
import {
  useGetHouseholdSettings,
  useUpdateHouseholdSettings,
} from '@/lib/data-access/household';

interface HouseholdSettingsFormFieldsProps {
  settlementThreshold: number | null;
}

const HouseholdSettingsFormFields = ({
  settlementThreshold,
}: HouseholdSettingsFormFieldsProps) => {
  const mutation = useUpdateHouseholdSettings();

  const form = useAppForm({
    defaultValues: {
      thresholdDollars:
        settlementThreshold != null ? String(settlementThreshold / 100) : '',
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
      const threshold = value.thresholdDollars.trim();
      let cents: number | null = null;
      try {
        cents = threshold === '' ? null : parseCurrencyInput(threshold);
      } catch {
        form.setErrorMap({ onSubmit: 'Must be a positive number.' });
        return;
      }
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
            <LoadingButton type="submit" loading={isSubmitting}>
              Save changes
            </LoadingButton>
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

export const HouseholdSettingsForm = () => {
  const { data, isLoading } = useGetHouseholdSettings();

  if (isLoading) {
    return <Skeleton className="h-9 w-48" />;
  }

  return (
    <HouseholdSettingsFormFields
      key={String(data?.settlementThreshold ?? 'unset')}
      settlementThreshold={data?.settlementThreshold ?? null}
    />
  );
};
