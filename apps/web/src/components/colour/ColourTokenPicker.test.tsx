import '@/test/mockPopover';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColourTokenPicker } from '@/components/colour/ColourTokenPicker';

const optionNames = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.getAttribute('aria-label'));

describe('ColourTokenPicker', () => {
  it('shows the selected colour on the trigger', () => {
    render(<ColourTokenPicker value="teal-600" onChange={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Category colour: Teal 600' })
    ).toBeInTheDocument();
  });

  it('offers every hue at five shades', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getAllByRole('option')).toHaveLength(90);
    expect(
      screen.getByRole('option', { name: 'Red 500', selected: true })
    ).toBeInTheDocument();
  });

  it('narrows to one hue when searching by hue name', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'fuchsia');

    expect(optionNames()).toEqual([
      'Fuchsia 300',
      'Fuchsia 400',
      'Fuchsia 500',
      'Fuchsia 600',
      'Fuchsia 700',
    ]);
  });

  it('narrows to a single swatch when searching by hue and shade', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'sky 300');

    expect(optionNames()).toEqual(['Sky 300']);
  });

  it('calls onChange with the clicked swatch token and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColourTokenPicker value="red-500" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'fuchsia');
    await user.click(screen.getByRole('option', { name: 'Fuchsia 700' }));

    expect(onChange).toHaveBeenCalledWith('fuchsia-700');
    expect(
      screen.getByRole('button', { name: /^Category colour/ })
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
