import '@/test/mockPopover';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LucideIconPicker } from '@/components/categories/LucideIconPicker';

describe('LucideIconPicker', () => {
  it('searches the full Lucide catalog for icons outside the old whitelist', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LucideIconPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button'));

    const search = screen.getByPlaceholderText('Search icons…');
    await user.type(search, 'anchor');

    const anchorOption = await waitFor(() =>
      screen.getByRole('option', { name: 'Anchor' })
    );
    await user.click(anchorOption);

    expect(onChange).toHaveBeenCalledWith('Anchor');
  });

  it('finds icons when searching with PascalCase names', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LucideIconPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button'));

    const search = screen.getByPlaceholderText('Search icons…');
    await user.type(search, 'ShoppingCart');

    const shoppingCartOption = await waitFor(() =>
      screen.getByRole('option', { name: 'ShoppingCart' })
    );
    await user.click(shoppingCartOption);

    expect(onChange).toHaveBeenCalledWith('ShoppingCart');
  });

  it('virtualizes the full catalog instead of mounting every icon at once', async () => {
    const user = userEvent.setup();

    render(<LucideIconPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeLessThan(100);
    });
  });
});
