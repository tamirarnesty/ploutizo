import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, vi } from 'vitest';
import type { ComponentType } from 'react';

type DecimalInputProps<T> = {
  id: string;
  value: T;
  onChange: (value: T) => void;
  onBlur?: () => void;
  'aria-invalid'?: boolean;
};

export const ControlledDecimalInput = <T,>({
  Input,
  initialValue,
  formatOutput,
  inputProps,
}: {
  Input: ComponentType<DecimalInputProps<T>>;
  initialValue: T;
  formatOutput?: (value: T) => string;
  inputProps?: Partial<DecimalInputProps<T>>;
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <Input
        id="test-decimal-input"
        value={value}
        onChange={setValue}
        onBlur={vi.fn()}
        {...inputProps}
      />
      <output data-testid="value">
        {formatOutput ? formatOutput(value) : String(value)}
      </output>
    </>
  );
};

export const expectAriaInvalidForwarded = <T,>(
  Input: ComponentType<DecimalInputProps<T>>,
  value: T
) => {
  render(
    <Input
      id="test-decimal-input"
      value={value}
      onChange={vi.fn()}
      aria-invalid
    />
  );
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
};

export const expectBlurredThenFocusedDisplay = async (
  blurred: string,
  focused: string
) => {
  const input = screen.getByRole('textbox');
  expect(input).toHaveValue(blurred);

  const user = userEvent.setup();
  await user.click(input);
  expect(input).toHaveValue(focused);
};

export const expectFiltersInvalidCharacters = async ({
  clearFirst = false,
}: { clearFirst?: boolean } = {}) => {
  const user = userEvent.setup();
  const input = screen.getByRole('textbox');
  await user.click(input);
  if (clearFirst) {
    await user.clear(input);
  }
  await user.type(input, '12abc34');

  expect(input).toHaveValue('1234');
  expect(screen.getByTestId('value')).toHaveTextContent('1234');
};
