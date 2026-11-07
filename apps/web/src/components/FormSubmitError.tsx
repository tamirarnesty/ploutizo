import { Text } from '@ploutizo/ui/components/text';
import type { ReactNode } from 'react';

/** Minimal Subscribe surface shared by every `useAppForm` instance. */
interface SubscribeCapableForm {
  Subscribe: (props: {
    selector?: (state: { errorMap: { onSubmit?: unknown } }) => unknown;
    children: (state: unknown) => ReactNode;
  }) => ReactNode | Promise<ReactNode>;
}

/** Renders the form-level submit error (`errorMap.onSubmit`), if any. */
export const FormSubmitError = ({ form }: { form: SubscribeCapableForm }) => (
  <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
    {(err) => (err ? <Text variant="error">{String(err)}</Text> : null)}
  </form.Subscribe>
);
