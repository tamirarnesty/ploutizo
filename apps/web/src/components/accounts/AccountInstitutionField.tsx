import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { accountInstitutionViolation } from '@ploutizo/validators';
import {
  FINANCIAL_INSTITUTIONS,
  accountRequiresFinancialInstitution,
} from '@ploutizo/types';
import type { FinancialInstitutionId } from '@ploutizo/types';
import type { AccountFormValues } from '@ploutizo/validators';
import type { AccountFormInstance } from './useAccountForm';

const OPTIONAL_INSTITUTION_SELECT_VALUE = '__none__';

interface AccountInstitutionFieldProps {
  form: AccountFormInstance;
}

/** Financial institution catalog; required for some account types. */
export const AccountInstitutionField = ({
  form,
}: AccountInstitutionFieldProps) => (
  <form.Subscribe
    selector={(s: { values: AccountFormValues }) => s.values.type}
  >
    {(type) => {
      const required = accountRequiresFinancialInstitution(type);
      return (
        <form.AppField
          name="institutionId"
          validators={{
            onSubmit: ({ value, fieldApi }) => {
              const message = accountInstitutionViolation(
                fieldApi.form.getFieldValue('type'),
                value as string | null | undefined
              );
              return message ? { message } : undefined;
            },
          }}
        >
          {(field) => (
            <Field
              data-invalid={field.state.meta.errors.length > 0 || undefined}
            >
              <FieldLabel htmlFor="account-institution">
                Financial institution
              </FieldLabel>
              <Select
                value={field.state.value ?? OPTIONAL_INSTITUTION_SELECT_VALUE}
                onValueChange={(value) =>
                  field.handleChange(
                    value === OPTIONAL_INSTITUTION_SELECT_VALUE
                      ? null
                      : (value as FinancialInstitutionId)
                  )
                }
              >
                <SelectTrigger id="account-institution">
                  <SelectValue placeholder="Select a Financial institution">
                    {(value: string) =>
                      FINANCIAL_INSTITUTIONS.find(
                        (institution) => institution.id === value
                      )?.name ?? (required ? 'Select…' : 'None')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {required ? null : (
                      <SelectItem value={OPTIONAL_INSTITUTION_SELECT_VALUE}>
                        None
                      </SelectItem>
                    )}
                    {FINANCIAL_INSTITUTIONS.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {field.state.meta.errors.length > 0 ? (
                <FieldError
                  errors={field.state.meta.errors as { message?: string }[]}
                />
              ) : null}
            </Field>
          )}
        </form.AppField>
      );
    }}
  </form.Subscribe>
);
