import { useAppForm } from '@ploutizo/ui/components/form';
import type { DeepKeys } from '@tanstack/react-form';

export const DEFAULT_SUBMIT_ERROR_MESSAGE =
  "Couldn't save changes. Check your connection and try again.";

interface ParseableSchema {
  safeParse: (
    value: unknown
  ) =>
    | { success: true }
    | { success: false; error: { issues: { message: string }[] } };
}

/** `validators.onSubmit` body for a Zod schema — joins issue messages. */
export const schemaSubmitValidator =
  (schema: ParseableSchema) =>
  (value: unknown): string | undefined => {
    const result = schema.safeParse(value);
    if (!result.success) {
      return result.error.issues.map((issue) => issue.message).join(', ');
    }
    return undefined;
  };

interface EntityFormMutation<TPayload> {
  mutate: (
    payload: TPayload,
    options?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
}

interface UseEntityFormOptions<TValues, TPayload> {
  defaultValues: TValues;
  /** Submit validator — return an error message to block submission. */
  validate?: (value: TValues) => string | undefined;
  /** Map form values to the mutation payload. Return undefined to abort. */
  toPayload: (value: TValues) => TPayload | undefined;
  create?: EntityFormMutation<TPayload>;
  update?: EntityFormMutation<TPayload>;
  isEditing?: boolean;
  onClose?: () => void;
  /**
   * Map a mutation error to a field-level error. Return undefined for the
   * default submit error (`submitErrorMessage`).
   */
  mapMutationError?: (
    error: unknown
  ) => { field: DeepKeys<TValues>; message: string } | undefined;
  submitErrorMessage?: string;
}

/**
 * Shared create/edit entity form scaffold: schema validation on submit,
 * create-vs-update mutation dispatch, close-on-success, and a consistent
 * submit error. Each form only declares values, payload mapping, and fields.
 */
export const useEntityForm = <TValues, TPayload>({
  defaultValues,
  validate,
  toPayload,
  create,
  update,
  isEditing = false,
  onClose,
  mapMutationError,
  submitErrorMessage = DEFAULT_SUBMIT_ERROR_MESSAGE,
}: UseEntityFormOptions<TValues, TPayload>) => {
  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: ({ value }) => validate?.(value),
    },
    onSubmit: ({ value }) => {
      const payload = toPayload(value);
      if (payload === undefined) return;
      const mutation = (isEditing ? update : create) ?? update ?? create;
      if (!mutation) {
        throw new Error('useEntityForm: no create or update mutation given');
      }
      mutation.mutate(payload, {
        onSuccess: onClose ? () => onClose() : undefined,
        onError: (error) => {
          const fieldError = mapMutationError?.(error);
          if (fieldError) {
            form.setFieldMeta(fieldError.field, (prev) => ({
              ...prev,
              errors: [fieldError.message],
            }));
          } else {
            form.setErrorMap({ onSubmit: submitErrorMessage });
          }
        },
      });
    },
  });

  return { form, isEditing };
};
