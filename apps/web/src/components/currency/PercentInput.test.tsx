import '@/components/currency/__test__/inputGroupMock';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PercentInput } from '@/components/currency/PercentInput';

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

  it('rounds parent value to one decimal on blur', async () => {
    const user = userEvent.setup();
    render(<ControlledPercentInput initialValue={10} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '40.55');
    await user.tab();

    expect(input).toHaveValue('40.6');
    expect(screen.getByTestId('value')).toHaveTextContent('40.6');
  });

  it('sanitizes percent paste', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PercentInput id="test-percent" value={0} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('50.5%');

    expect(input).toHaveValue('50.5');
    expect(onChange).toHaveBeenLastCalledWith(50.5);
  });

  it('forwards aria-invalid to the input', () => {
    render(
      <PercentInput
        id="test-percent"
        value={10}
        onChange={vi.fn()}
        aria-invalid
      />
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
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
