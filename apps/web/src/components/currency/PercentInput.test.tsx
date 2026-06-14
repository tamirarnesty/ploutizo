import '@/test/mockInputGroup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PercentInput } from '@/components/currency/PercentInput';
import {
  ControlledDecimalInput,
  expectAriaInvalidForwarded,
  expectBlurredThenFocusedDisplay,
  expectFiltersInvalidCharacters,
} from '@/components/currency/__test__/decimalInputTestUtils';

describe('PercentInput', () => {
  it('renders formatted value when blurred', () => {
    render(<ControlledDecimalInput Input={PercentInput} initialValue={50} />);

    expect(screen.getByRole('textbox')).toHaveValue('50.0');
  });

  it('shows unformatted value on focus', async () => {
    render(
      <ControlledDecimalInput Input={PercentInput} initialValue={33.33} />
    );

    await expectBlurredThenFocusedDisplay('33.3', '33.33');
  });

  it('filters invalid characters on type', async () => {
    render(<ControlledDecimalInput Input={PercentInput} initialValue={0} />);

    await expectFiltersInvalidCharacters({ clearFirst: true });
  });

  it('defers empty and partial decimal parent updates', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PercentInput id="test-percent" value={25} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '.');

    expect(input).toHaveValue('.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resets display to one decimal place on blur', async () => {
    const user = userEvent.setup();
    render(
      <ControlledDecimalInput Input={PercentInput} initialValue={33.33} />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '40');
    await user.tab();

    expect(input).toHaveValue('40.0');
    expect(screen.getByTestId('value')).toHaveTextContent('40');
  });

  it('rounds parent value to one decimal on blur', async () => {
    const user = userEvent.setup();
    render(<ControlledDecimalInput Input={PercentInput} initialValue={10} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '40.55');
    await user.tab();

    expect(input).toHaveValue('40.6');
    expect(screen.getByTestId('value')).toHaveTextContent('40.6');
  });

  it('sanitizes percent paste and commits on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PercentInput id="test-percent" value={0} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('50.5%');
    await user.tab();

    expect(input).toHaveValue('50.5');
    expect(onChange).toHaveBeenLastCalledWith(50.5);
  });

  it('calls caller focus and paste handlers', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onPaste = vi.fn();
    const onChange = vi.fn();

    render(
      <PercentInput
        id="test-percent"
        value={0}
        onChange={onChange}
        onFocus={onFocus}
        onPaste={onPaste}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('50.5%');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('50.5');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards aria-invalid to the input', () => {
    expectAriaInvalidForwarded(PercentInput, 10);
  });

  it('syncs display when parent value changes while unfocused', () => {
    const { rerender } = render(
      <PercentInput id="test-percent" value={25} onChange={vi.fn()} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('25.0');

    rerender(
      <PercentInput id="test-percent" value={33.3} onChange={vi.fn()} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('33.3');
  });
});
