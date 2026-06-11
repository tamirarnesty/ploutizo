import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import type { ChangeEvent, ComponentProps, FocusEvent } from 'react';

export type PercentInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'onBlur' | 'type' | 'inputMode' | 'autoComplete'
> & {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  className?: string;
  inputClassName?: string;
};

const sanitizePercentEditString = (input: string): string => {
  let result = '';
  let hasDot = false;
  for (const char of input) {
    if (char >= '0' && char <= '9') {
      result += char;
    } else if (char === '.' && !hasDot) {
      hasDot = true;
      result += char;
    }
  }
  return result;
};

const toBlurDisplay = (percentage: number): string => percentage.toFixed(1);

const toEditDisplay = (percentage: number): string => percentage.toString();

export const PercentInput = ({
  value,
  onChange,
  onBlur,
  className,
  inputClassName,
  ...inputProps
}: PercentInputProps) => {
  const focused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() => toBlurDisplay(value));

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(toBlurDisplay(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = sanitizePercentEditString(e.target.value);
      setDisplayValue(next);
      const parsed = parseFloat(next);
      if (Number.isFinite(parsed)) {
        onChange(parsed);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      focused.current = true;
      setDisplayValue(toEditDisplay(value));
    },
    [value]
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      focused.current = false;
      setDisplayValue(toBlurDisplay(value));
      onBlur?.();
    },
    [onBlur, value]
  );

  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">%</InputGroupAddon>
      <InputGroupInput
        {...inputProps}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={inputClassName}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </InputGroup>
  );
};
