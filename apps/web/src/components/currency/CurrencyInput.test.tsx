import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import type { ComponentProps } from 'react';

vi.mock('@ploutizo/ui/components/input-group', () => ({
  InputGroup: ({
    children,
    className,
  }: ComponentProps<'div'> & { className?: string }) => (
    <div className={className}>{children}</div>
  ),
  InputGroupAddon: ({ children }: ComponentProps<'div'>) => (
    <div>{children}</div>
  ),
  InputGroupText: ({ children }: ComponentProps<'span'>) => (
    <span>{children}</span>
  ),
  InputGroupInput: (props: ComponentProps<'input'>) => <input {...props} />,
}));

const ControlledCurrencyInput = ({
  initialValue,
  commitEmptyAs,
}: {
  initialValue?: number;
  commitEmptyAs?: number;
}) => {
  const [value, setValue] = useState<number | undefined>(initialValue);
  return (
    <>
      <CurrencyInput
        id="test-currency"
        value={value}
        onChange={setValue}
        onBlur={vi.fn()}
        commitEmptyAs={commitEmptyAs}
      />
      <output data-testid="value">{value ?? 'empty'}</output>
    </>
  );
};

describe('CurrencyInput', () => {
  it('renders formatted value when blurred', () => {
    render(<ControlledCurrencyInput initialValue={1234.56} />);

    expect(screen.getByRole('textbox')).toHaveValue('1,234.56');
  });

  it('shows unformatted value on focus', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput initialValue={1234.56} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(input).toHaveValue('1234.56');
  });

  it('filters invalid characters on type', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '12abc34');

    expect(input).toHaveValue('1234');
    expect(screen.getByTestId('value')).toHaveTextContent('1234');
  });

  it('allows one decimal point and partial states', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '.');

    expect(input).toHaveValue('.');
    expect(screen.getByTestId('value')).toHaveTextContent('empty');

    await user.type(input, '12');

    expect(input).toHaveValue('.12');
    expect(screen.getByTestId('value')).toHaveTextContent('0.12');
  });

  it('sanitizes paste and emits dollars', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CurrencyInput id="test-currency" value={undefined} onChange={onChange} />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.paste('$ 1,234.56');

    expect(input).toHaveValue('1234.56');
    expect(onChange).toHaveBeenLastCalledWith(1234.56);
  });

  it('emits undefined on empty input', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput initialValue={12} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);

    expect(screen.getByTestId('value')).toHaveTextContent('empty');
  });

  it('keeps unrounded parent value mid-type until blur', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '12.345');

    expect(screen.getByTestId('value')).toHaveTextContent('12.345');
    await user.tab();

    expect(input).toHaveValue('12.35');
    expect(screen.getByTestId('value')).toHaveTextContent('12.35');
  });

  it('forwards aria-invalid to the input', () => {
    render(
      <CurrencyInput
        id="test-currency"
        value={10}
        onChange={vi.fn()}
        aria-invalid
      />
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
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
});
