import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsFormDialog } from '@/components/settings/SettingsFormDialog';
import { expectOverlayMounted } from '@/test/overlayCloseContract';

describe('SettingsFormDialog overlay contract', () => {
  it('keeps dialog content mounted through the close animation', () => {
    const { rerender } = render(
      <SettingsFormDialog
        open
        onOpenChange={vi.fn()}
        title="Edit category"
        description="Test description"
        formKey="cat-1"
      >
        <p>Form body</p>
      </SettingsFormDialog>
    );

    expect(screen.getByText('Form body')).toBeInTheDocument();

    rerender(
      <SettingsFormDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Edit category"
        description="Test description"
        formKey="cat-1"
      >
        <p>Form body</p>
      </SettingsFormDialog>
    );

    expectOverlayMounted('dialog');
    expect(screen.getByText('Form body')).toBeInTheDocument();
  });

  it('forwards close via onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <SettingsFormDialog
        open
        onOpenChange={onOpenChange}
        title="Add category"
        description="Test description"
        formKey="new"
      >
        <p>Form body</p>
      </SettingsFormDialog>
    );

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});
