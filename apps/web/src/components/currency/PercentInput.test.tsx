import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PercentInput } from '@/components/currency/PercentInput';
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
  InputGroupInput: (props: ComponentProps<'input'>) => <input {...props} />,
}));

const ControlledPercentInput = ({ initialValue }: { initialValue: number }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <PercentInput
        id="test-percent"
        value={value}
        onChange={setValue}
        onBlur={vi.fn()}
      />
      <output data-testid="value">{value}</output>
    </>
  );
};

describe('PercentInput', () => {
  it('renders formatted value when blurred', () => {
    render(<ControlledPercentInput initialValue={50} />);

    expect(screen.getByRole('textbox')).toHaveValue('50.0');
  });

  it('shows unformatted value on focus', async () => {
    const user = userEvent.setup();
    render(<ControlledPercentInput initialValue={50.5} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(input).toHaveValue('50.5');
  });

  it('filters invalid characters on type', async () => {
    const user = userEvent.setup();
    render(<ControlledPercentInput initialValue={0} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '12abc34');

    expect(input).toHaveValue('1234');
    expect(screen.getByTestId('value')).toHaveTextContent('1234');
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
    render(<ControlledPercentInput initialValue={33.33} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '40');
    await user.tab();

    expect(input).toHaveValue('40.0');
    expect(screen.getByTestId('value')).toHaveTextContent('40');
  });
});
