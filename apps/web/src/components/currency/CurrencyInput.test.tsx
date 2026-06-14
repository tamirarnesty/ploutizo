import '@/test/mockInputGroup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import {
  ControlledDecimalInput,
  expectAriaInvalidForwarded,
  expectBlurredThenFocusedDisplay,
  expectFiltersInvalidCharacters,
} from '@/components/currency/__test__/decimalInputTestUtils';
import {
  PendingInputFlushProvider,
  useFlushPendingInputs,
} from '@/lib/money/pending-input-flush';

describe('CurrencyInput', () => {
  it('renders formatted value when blurred', () => {
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={1234.56}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    expect(screen.getByRole('textbox')).toHaveValue('1,234.56');
  });

  it('shows unformatted value on focus', async () => {
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={1234.56}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    await expectBlurredThenFocusedDisplay('1,234.56', '1234.56');
  });

  it('filters invalid characters on type', async () => {
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={undefined}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    await expectFiltersInvalidCharacters();
  });

  it('allows partial decimal states without parent updates until blur', async () => {
    const user = userEvent.setup();
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={undefined}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '.12');

    expect(input).toHaveValue('.12');
    expect(screen.getByTestId('value')).toHaveTextContent('empty');

    await user.tab();
    expect(screen.getByTestId('value')).toHaveTextContent('0.12');
  });

  it('sanitizes paste and commits on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CurrencyInput id="test-currency" value={undefined} onChange={onChange} />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.paste('$ 1,234.56');
    await user.tab();

    expect(input).toHaveValue('1,234.56');
    expect(onChange).toHaveBeenLastCalledWith(1234.56);
  });

  it('calls caller focus and paste handlers', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onPaste = vi.fn();
    const onChange = vi.fn();

    render(
      <CurrencyInput
        id="test-currency"
        value={undefined}
        onChange={onChange}
        onFocus={onFocus}
        onPaste={onPaste}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.paste('$ 1,234.56');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('1234.56');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits undefined on empty blur', async () => {
    const user = userEvent.setup();
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={12}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.tab();

    expect(screen.getByTestId('value')).toHaveTextContent('empty');
  });

  it('keeps unrounded value mid-type until blur', async () => {
    const user = userEvent.setup();
    render(
      <ControlledDecimalInput
        Input={CurrencyInput}
        initialValue={undefined}
        formatOutput={(value) =>
          value === undefined ? 'empty' : String(value)
        }
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '12.345');

    expect(screen.getByTestId('value')).toHaveTextContent('empty');
    await user.tab();

    expect(input).toHaveValue('12.35');
    expect(screen.getByTestId('value')).toHaveTextContent('12.35');
  });

  it('forwards aria-invalid to the input', () => {
    expectAriaInvalidForwarded(CurrencyInput, 10);
  });

  it('commits empty blur to commitEmptyAs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CurrencyInput
        id="test-currency"
        value={5}
        onChange={onChange}
        commitEmptyAs={0}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(input).toHaveValue('0.00');
  });

  it('syncs display when parent value changes while unfocused', () => {
    const { rerender } = render(
      <CurrencyInput id="test-currency" value={25} onChange={vi.fn()} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('25.00');

    rerender(
      <CurrencyInput id="test-currency" value={33.3} onChange={vi.fn()} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('33.30');
  });

  it('flushes pending edit on submit flush', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const FlushHarness = () => {
      const flushPendingInputs = useFlushPendingInputs();
      return (
        <>
          <CurrencyInput id="test-currency" value={10} onChange={onChange} />
          <button type="button" onClick={() => flushPendingInputs()}>
            Flush
          </button>
        </>
      );
    };

    render(
      <PendingInputFlushProvider>
        <FlushHarness />
      </PendingInputFlushProvider>
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '25.50');
    await user.click(screen.getByRole('button', { name: 'Flush' }));

    expect(onChange).toHaveBeenLastCalledWith(25.5);
    expect(input).toHaveValue('25.50');
  });
});
