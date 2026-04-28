// packages/ui/src/components/form.tsx
// Project-wide TanStack Form hook via composition API.
// Provides useAppForm (augmented with form.AppField) and form context symbols.
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
});
