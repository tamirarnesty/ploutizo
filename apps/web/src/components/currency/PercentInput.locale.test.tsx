import '@/test/mockInputGroup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PercentInput } from '@/components/currency/PercentInput';
import { MoneyLocaleProvider } from '@/lib/money/money-locale';

const renderWithLocale = (
  ui: React.ReactElement,
  locale = 'en-CA',
  currency = 'CAD'
) =>
  render(
    <MoneyLocaleProvider value={{ locale, currency }}>{ui}</MoneyLocaleProvider>
  );

describe('PercentInput locale', () => {
  it('commits fr-CA comma decimal on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithLocale(
      <PercentInput id="test-percent" value={25} onChange={onChange} />,
      'fr-CA'
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '60,5');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(60.5);
    expect(input).toHaveValue('60,5');
  });
});
