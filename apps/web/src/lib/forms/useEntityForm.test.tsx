import { act, render, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SUBMIT_ERROR_MESSAGE, useEntityForm } from './useEntityForm';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useEntityForm submit', () => {
  it('keeps isSubmitting true until mutateAsync settles, then closes', async () => {
    const pending = deferred<{ ok: true }>();
    const mutateAsync = vi.fn(() => pending.promise);
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityForm({
        defaultValues: { name: 'Ada' },
        toPayload: (value) => value,
        create: { mutateAsync },
        onClose,
      })
    );

    let submitPromise: Promise<void> | undefined;
    await act(async () => {
      submitPromise = result.current.form.handleSubmit();
    });

    expect(mutateAsync).toHaveBeenCalledWith({ name: 'Ada' });
    expect(result.current.form.state.isSubmitting).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ ok: true });
      await submitPromise;
    });

    await waitFor(() => {
      expect(result.current.form.state.isSubmitting).toBe(false);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sets the submit error and does not close when mutateAsync rejects', async () => {
    const mutateAsync = vi.fn(() => Promise.reject(new Error('offline')));
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityForm({
        defaultValues: { name: 'Ada' },
        toPayload: (value) => value,
        create: { mutateAsync },
        onClose,
      })
    );

    await act(async () => {
      await result.current.form.handleSubmit();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.form.state.isSubmitting).toBe(false);
    expect(result.current.form.state.errorMap.onSubmit).toBe(
      DEFAULT_SUBMIT_ERROR_MESSAGE
    );
  });

  it('maps a mutation error onto a field when mapMutationError returns one', async () => {
    const mutateAsync = vi.fn(() => Promise.reject(new Error('duplicate')));
    const onClose = vi.fn();

    const FieldErrorProbe = () => {
      const { form } = useEntityForm({
        defaultValues: { name: 'Ada' },
        toPayload: (value) => value,
        create: { mutateAsync },
        onClose,
        mapMutationError: () => ({
          field: 'name',
          message: 'That name is already in use.',
        }),
      });

      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.AppField name="name">
            {(field) => (
              <span data-testid="name-errors">
                {field.state.meta.errors.join(',')}
              </span>
            )}
          </form.AppField>
          <button type="submit">Save</button>
        </form>
      );
    };

    const { getByRole, getByTestId } = render(<FieldErrorProbe />);

    await act(async () => {
      getByRole('button', { name: 'Save' }).click();
    });

    await waitFor(() => {
      expect(getByTestId('name-errors')).toHaveTextContent(
        'That name is already in use.'
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call the mutation when toPayload returns undefined', async () => {
    const mutateAsync = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityForm({
        defaultValues: { name: 'Ada' },
        toPayload: () => undefined,
        create: { mutateAsync },
        onClose,
      })
    );

    await act(async () => {
      await result.current.form.handleSubmit();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
