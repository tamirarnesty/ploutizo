import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsFormDialog } from '@/components/settings/SettingsFormDialog';
import { expectOverlayMounted } from '@/test/overlayCloseContract';

describe('SettingsFormDialog overlay contract', () => {
  it('keeps dialog root mounted when closed (CategoryDialog / RuleDialog pattern)', () => {
    const { container } = render(
      <SettingsFormDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Edit category"
        formKey="cat-1"
      >
        <p>Form body</p>
      </SettingsFormDialog>
    );

    expectOverlayMounted(container, 'dialog');
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
        formKey="new"
      >
        <p>Form body</p>
      </SettingsFormDialog>
    );

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
