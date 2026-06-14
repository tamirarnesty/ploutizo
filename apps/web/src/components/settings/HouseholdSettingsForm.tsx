import { useAppForm } from '@ploutizo/ui/components/form';
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@ploutizo/ui/components/field';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { HouseholdSettingsFormSchema } from '@ploutizo/validators';
import {
  RadioGroup,
  RadioGroupItem,
} from '@ploutizo/ui/components/radio-group';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { formatCurrency } from '@ploutizo/utils/currency';
import {
  DEFAULT_SETTLEMENT_THRESHOLD_CENTS,
  settlementThresholdCentsFromMode,
  settlementThresholdDollarsFromCents,
  settlementThresholdModeFromCents,
} from '@ploutizo/utils/settlement-threshold';
import type { SettlementThresholdMode } from '@ploutizo/utils/settlement-threshold';
import type { HouseholdSettingsForm as HouseholdSettingsFormType } from '@ploutizo/validators';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import { useMoneyLocale } from '@/lib/money/money-locale';
import {
  useGetHouseholdSettings,
  useUpdateHouseholdSettings,
} from '@/lib/data-access/household';

interface HouseholdSettingsFormFieldsProps {
  settlementThreshold: number | null;
}

const toHouseholdSettingsFormDefaults = (
  settlementThreshold: number | null
): HouseholdSettingsFormType => {
  const thresholdMode = settlementThresholdModeFromCents(settlementThreshold);

  if (thresholdMode === 'app_default' || thresholdMode === 'immediate') {
    return { thresholdMode };
  }

  return {
    thresholdMode,
    thresholdDollars:
      settlementThresholdDollarsFromCents(settlementThreshold) ?? 0,
  };
};

const thresholdModeInputId = (mode: SettlementThresholdMode) =>
  `settlement-threshold-mode-${mode}`;

const ThresholdModeOption = ({
  mode,
  title,
  description,
}: {
  mode: SettlementThresholdMode;
  title: string;
  description: string;
}) => {
  const id = thresholdModeInputId(mode);

  return (
    <FieldLabel htmlFor={id}>
      <Field
        orientation="horizontal"
        className="h-full rounded-md border border-input p-2.5 has-[>[data-slot=field-content]]:items-start [&>[role=radio]]:mt-0.5"
      >
        <RadioGroupItem value={mode} id={id} className="shrink-0" />
        <FieldContent className="gap-0">
          <FieldTitle className="text-sm">{title}</FieldTitle>
          <Text variant="caption" className="text-xs leading-snug">
            {description}
          </Text>
        </FieldContent>
      </Field>
    </FieldLabel>
  );
};

const HouseholdSettingsFormFields = ({
  settlementThreshold,
}: HouseholdSettingsFormFieldsProps) => {
  const mutation = useUpdateHouseholdSettings();
  const { locale, currency } = useMoneyLocale();
  const defaultThresholdLabel = formatCurrency(
    DEFAULT_SETTLEMENT_THRESHOLD_CENTS,
    currency,
    locale,
    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
  );

  const form = useAppForm({
    defaultValues: toHouseholdSettingsFormDefaults(settlementThreshold),
    validators: {
      onSubmit: ({ value }: { value: HouseholdSettingsFormType }) => {
        const result = HouseholdSettingsFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          settlementThreshold: settlementThresholdCentsFromMode(
            value.thresholdMode,
            value.thresholdDollars
          ),
        },
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
      <div className="flex max-w-xl flex-col gap-4">
        <form.AppField name="thresholdMode">
          {(field) => (
            <RadioGroup
              value={field.state.value}
              onValueChange={(next) => {
                if (next !== null) {
                  field.handleChange(next as SettlementThresholdMode);
                }
              }}
              className="grid-cols-3 gap-2"
            >
              <ThresholdModeOption
                mode="app_default"
                title="Default"
                description={`Use ${defaultThresholdLabel}`}
              />
              <ThresholdModeOption
                mode="immediate"
                title="Immediate"
                description="Any card balance"
              />
              <ThresholdModeOption
                mode="custom"
                title="Custom"
                description="Set your own amount"
              />
            </RadioGroup>
          )}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values.thresholdMode}>
          {(thresholdMode) =>
            thresholdMode === 'custom' ? (
              <form.AppField
                name="thresholdDollars"
                validators={{
                  onChange: ({ value }: { value: number | undefined }) => {
                    const result = HouseholdSettingsFormSchema.safeParse({
                      thresholdMode: 'custom',
                      thresholdDollars: value,
                    });
                    if (!result.success) {
                      return result.error.issues
                        .map((issue) => issue.message)
                        .join(', ');
                    }
                  },
                }}
              >
                {(field) => (
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel htmlFor="settlement-threshold">
                      Amount
                    </FieldLabel>
                    <CurrencyInput
                      id="settlement-threshold"
                      className="w-auto min-w-32"
                      aria-invalid={field.state.meta.errors.length > 0}
                      value={field.state.value}
                      onChange={(v) => field.handleChange(v)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <FieldError
                        errors={
                          field.state.meta.errors as { message?: string }[]
                        }
                      />
                    ) : null}
                  </Field>
                )}
              </form.AppField>
            ) : null
          }
        </form.Subscribe>

        <div>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <LoadingButton type="submit" loading={isSubmitting}>
                Save changes
              </LoadingButton>
            )}
          </form.Subscribe>
        </div>
        <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
          {(err) => (err ? <Text variant="error">{String(err)}</Text> : null)}
        </form.Subscribe>
      </div>
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
