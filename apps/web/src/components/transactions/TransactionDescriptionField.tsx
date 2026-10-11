import { Lock, SquarePen } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

interface TransactionDescriptionFieldProps {
  form: TransactionFormInstance;
  isLocked: boolean;
  lockedValue: string;
  onUnlock: () => void;
}

/** Locked for transfer/settlement/contribution/linked-refund (D-11, D-12). */
export const TransactionDescriptionField = ({
  form,
  isLocked,
  lockedValue,
  onUnlock,
}: TransactionDescriptionFieldProps) => (
  <form.AppField
    name="description"
    validators={{
      onSubmit: ({ value }: { value: string }) =>
        !isLocked && !value.trim() ? 'Description is required.' : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-description">Description</FieldLabel>
        {isLocked ? (
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>
                <Lock
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              readOnly
              value={lockedValue}
              className="cursor-default bg-muted text-muted-foreground"
              aria-label="Description (auto-generated)"
              autoComplete="off"
            />
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      type="button"
                      aria-label="Edit description"
                      onClick={onUnlock}
                    />
                  }
                >
                  <SquarePen className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Edit description</TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <Input
            id="tx-description"
            autoComplete="off"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
        {field.state.meta.errors.length > 0 ? (
          <FieldError
            errors={
              field.state.meta.errors as unknown as {
                message?: string;
              }[]
            }
          />
        ) : null}
        {/* TODO(03.4-deferred): originalDescription column — add when schema patch lands */}
        {/* D-19: import caption (└ Original: ...) is deferred because originalDescription */}
        {/* and originalMerchant columns are absent from the current DB schema. */}
      </Field>
    )}
  </form.AppField>
);
