import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
import type { AccountFormValues } from '@ploutizo/validators';
import type { AccountFormInstance } from './useAccountForm';

interface AccountLastFourFieldsProps {
  form: AccountFormInstance;
}

/** Last four digits; credit cards split the row with the statement due day. */
export const AccountLastFourFields = ({ form }: AccountLastFourFieldsProps) => (
  <form.Subscribe
    selector={(s: { values: AccountFormValues }) => s.values.type}
  >
    {(type) => {
      const isCreditCard = type === 'credit_card';
      return (
        <div
          data-testid="account-last-four-row"
          className={
            isCreditCard ? 'grid grid-cols-2 gap-4 *:min-w-0' : undefined
          }
        >
          <form.AppField name="lastFour">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="account-last-four">
                  Last 4 digits
                </FieldLabel>
                <Input
                  id="account-last-four"
                  name="account-last-four"
                  autoComplete="off"
                  value={field.state.value ?? ''}
                  onChange={(e) =>
                    field.handleChange(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                  onBlur={field.handleBlur}
                  placeholder="1234"
                  maxLength={4}
                  className="font-mono"
                />
              </Field>
            )}
          </form.AppField>
          {isCreditCard ? (
            <form.AppField name="statementDueDay">
              {(field) => (
                <Field
                  data-testid="account-statement-due-day-wrap"
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <FieldLabel htmlFor="account-statement-due-day">
                    Statement due day
                  </FieldLabel>
                  <Input
                    id="account-statement-due-day"
                    name="account-statement-due-day"
                    autoComplete="off"
                    inputMode="numeric"
                    value={field.state.value ?? ''}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value.replace(/\D/g, '').slice(0, 2)
                      )
                    }
                    onBlur={field.handleBlur}
                    placeholder="15"
                    maxLength={2}
                    className="font-mono"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError
                      errors={
                        field.state.meta.errors as unknown as {
                          message?: string;
                        }[]
                      }
                    />
                  ) : null}
                </Field>
              )}
            </form.AppField>
          ) : null}
        </div>
      );
    }}
  </form.Subscribe>
);
