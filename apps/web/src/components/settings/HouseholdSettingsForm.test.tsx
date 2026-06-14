import '@/test/mockInputGroup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HouseholdSettingsForm } from '@/components/settings/HouseholdSettingsForm';
import type { ComponentProps } from 'react';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  getHouseholdSettings: vi.fn(),
}));

vi.mock('@ploutizo/ui/components/field', () => ({
  Field: ({ children, ...props }: ComponentProps<'div'>) => (
    <div {...props}>{children}</div>
  ),
  FieldContent: ({ children, ...props }: ComponentProps<'div'>) => (
    <div {...props}>{children}</div>
  ),
  FieldError: ({ errors }: { errors: (string | { message?: string })[] }) => (
    <div>
      {errors
        .map((error) => (typeof error === 'string' ? error : error.message))
        .join(', ')}
    </div>
  ),
  FieldLabel: ({ children, ...props }: ComponentProps<'label'>) => (
    <label {...props}>{children}</label>
  ),
  FieldTitle: ({ children, ...props }: ComponentProps<'div'>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@ploutizo/ui/components/loading-button', () => ({
  LoadingButton: ({
    children,
    loading: _loading,
    ...props
  }: ComponentProps<'button'> & {
    loading?: boolean;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@ploutizo/ui/components/skeleton', () => ({
  Skeleton: (props: ComponentProps<'div'>) => <div {...props} />,
}));

vi.mock('@ploutizo/ui/components/text', () => ({
  Text: ({
    children,
    variant: _variant,
    ...props
  }: ComponentProps<'p'> & { variant?: string }) => (
    <p {...props}>{children}</p>
  ),
}));

vi.mock('@/lib/data-access/household', () => ({
  useGetHouseholdSettings: mocks.getHouseholdSettings,
  useUpdateHouseholdSettings: () => ({
    mutate: mocks.mutate,
  }),
}));

describe('HouseholdSettingsForm', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.getHouseholdSettings.mockReset();
    mocks.getHouseholdSettings.mockReturnValue({
      data: { settlementThreshold: null },
      isLoading: false,
    });
  });

  it('submits app default mode as unset', async () => {
    const user = userEvent.setup();
    render(<HouseholdSettingsForm />);

    expect(screen.getByRole('radio', { name: /default/i })).toBeChecked();
    expect(screen.getByText('Use $50')).toBeInTheDocument();
    expect(screen.getByText('Any card balance')).toBeInTheDocument();
    expect(screen.getByText('Set your own amount')).toBeInTheDocument();
    expect(screen.queryByText('Use $50.00.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { settlementThreshold: null },
        expect.any(Object)
      );
    });
  });

  it('submits immediate mode as a zero-cent override', async () => {
    const user = userEvent.setup();
    mocks.getHouseholdSettings.mockReturnValue({
      data: { settlementThreshold: 0 },
      isLoading: false,
    });

    render(<HouseholdSettingsForm />);

    expect(screen.getByRole('radio', { name: /immediate/i })).toBeChecked();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { settlementThreshold: 0 },
        expect.any(Object)
      );
    });
  });

  it('submits custom positive threshold dollars as cents', async () => {
    const user = userEvent.setup();
    mocks.getHouseholdSettings.mockReturnValue({
      data: { settlementThreshold: 5000 },
      isLoading: false,
    });

    render(<HouseholdSettingsForm />);

    expect(screen.getByRole('radio', { name: /custom/i })).toBeChecked();
    expect(screen.getByRole('textbox')).toHaveValue('50.00');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { settlementThreshold: 5000 },
        expect.any(Object)
      );
    });
  });

  it('resets a custom threshold to app default', async () => {
    const user = userEvent.setup();
    mocks.getHouseholdSettings.mockReturnValue({
      data: { settlementThreshold: 5000 },
      isLoading: false,
    });

    render(<HouseholdSettingsForm />);

    await user.click(screen.getByRole('radio', { name: /default/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { settlementThreshold: null },
        expect.any(Object)
      );
    });
  });

  it('does not submit a zero custom threshold', async () => {
    const user = userEvent.setup();
    render(<HouseholdSettingsForm />);

    await user.click(screen.getByRole('radio', { name: /custom/i }));
    await user.type(screen.getByRole('textbox'), '0');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText('Enter an amount of at least $0.01.')
    ).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
