import { useEffect, useRef } from 'react';
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
  mutateAsync: (payload: TPayload) => Promise<unknown>;
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
  // Per-call `mutate` callbacks stop when the form unmounts. `mutateAsync`
  // does not, so a save that finishes after discard must not close the edit
  // that replaced this form.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: ({ value }) => validate?.(value),
    },
    onSubmit: async ({ value }) => {
      const payload = toPayload(value);
      if (payload === undefined) return;
      const mutation = (isEditing ? update : create) ?? update ?? create;
      if (!mutation) {
        throw new Error('useEntityForm: no create or update mutation given');
      }
      // Await the request so TanStack Form keeps `isSubmitting` true (and
      // LoadingButton in a loading state) until the save settles. `mutate`
      // returns immediately, so the button would flash idle while the
      // request was still in flight.
      try {
        await mutation.mutateAsync(payload);
        if (!mountedRef.current) return;
        onClose?.();
      } catch (error) {
        if (!mountedRef.current) return;
        const fieldError = mapMutationError?.(error);
        if (fieldError) {
          // Field `errors` is derived from `errorMap`; setting `errors`
          // directly is overwritten on the next store pass.
          form.setFieldMeta(fieldError.field, (prev) => ({
            ...prev,
            errorMap: {
              ...prev.errorMap,
              onSubmit: fieldError.message,
            },
          }));
        } else {
          form.setErrorMap({ onSubmit: submitErrorMessage });
        }
      }
    },
  });

  return { form, isEditing };
};
