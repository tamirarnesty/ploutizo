import { HouseholdSettingsFormSchema } from '@ploutizo/validators';
import { useAppForm } from '@ploutizo/ui/components/form';
import { FieldError } from '@ploutizo/ui/components/field';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { centsToDollars, dollarsToCents } from '@ploutizo/utils/currency';
import type { HouseholdSettingsForm as HouseholdSettingsFormType } from '@ploutizo/validators';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
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
        settlementThreshold != null
          ? centsToDollars(settlementThreshold)
          : undefined,
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
      const cents =
        value.thresholdDollars === undefined
          ? null
          : dollarsToCents(value.thresholdDollars);
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
        <form.AppField
          name="thresholdDollars"
          validators={{
            onChange: ({ value }: { value: number | undefined }) => {
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
              <CurrencyInput
                id="settlement-threshold"
                className="w-32"
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                onBlur={field.handleBlur}
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
