import '@/test/mockInputGroup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HouseholdSettingsForm } from '@/components/settings/HouseholdSettingsForm';
import type { ComponentProps, ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  getHouseholdSettings: vi.fn(),
}));

vi.mock('@ploutizo/ui/components/field', () => ({
  Field: ({ children, ...props }: ComponentProps<'div'>) => (
    <div {...props}>{children}</div>
  ),
  FieldError: ({ errors }: { errors: { message?: string }[] }) => (
    <div>{errors.map((error) => error.message).join(', ')}</div>
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
  Text: ({ children }: { children: ReactNode }) => <p>{children}</p>,
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
      data: { settlementThreshold: 0 },
      isLoading: false,
    });
  });

  it('submits zero threshold dollars as unset', async () => {
    const user = userEvent.setup();
    render(<HouseholdSettingsForm />);

    expect(screen.getByRole('textbox')).toHaveValue('0.00');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.mutate).toHaveBeenCalledWith(
        { settlementThreshold: null },
        expect.any(Object)
      );
    });
  });
});
