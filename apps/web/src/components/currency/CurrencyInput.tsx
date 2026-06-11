import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  centsToDollars,
  formatCurrencyBlurDisplay,
  mergeCurrencyEditPaste,
  parseCurrencyInput,
  sanitizeCurrencyEditString,
  tryParseDollarsFromEdit,
} from '@ploutizo/utils/currency';
import type {
  ChangeEvent,
  ClipboardEvent,
  ComponentProps,
  FocusEvent,
} from 'react';

export type CurrencyInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'onBlur' | 'type' | 'inputMode' | 'autoComplete'
> & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  className?: string;
  inputClassName?: string;
  /** Map empty blur to a number (e.g. settle form uses 0). Default: undefined */
  commitEmptyAs?: number;
};

const toEditDisplay = (dollars: number | undefined): string => {
  if (dollars === undefined || !Number.isFinite(dollars)) return '';
  return dollars.toString();
};

export const CurrencyInput = ({
  value,
  onChange,
  onBlur,
  className,
  inputClassName,
  commitEmptyAs,
  ...inputProps
}: CurrencyInputProps) => {
  const focused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatCurrencyBlurDisplay(value)
  );

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(formatCurrencyBlurDisplay(value));
    }
  }, [value]);

  const applyEditString = useCallback(
    (edit: string): string => {
      const next = sanitizeCurrencyEditString(edit);
      onChange(tryParseDollarsFromEdit(next));
      return next;
    },
    [onChange]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(applyEditString(e.target.value));
    },
    [applyEditString]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const next = mergeCurrencyEditPaste(
        displayValue,
        start,
        end,
        e.clipboardData.getData('text')
      );
      setDisplayValue(applyEditString(next));
    },
    [applyEditString, displayValue]
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

      const sanitized = sanitizeCurrencyEditString(displayValue);
      let rounded: number | undefined;
      if (!sanitized || sanitized === '.') {
        rounded = commitEmptyAs;
      } else {
        try {
          rounded = centsToDollars(parseCurrencyInput(displayValue));
        } catch {
          rounded = value;
        }
      }

      const formatted = formatCurrencyBlurDisplay(rounded);
      if (rounded !== value) {
        onChange(rounded);
      }
      setDisplayValue(formatted);
      onBlur?.();
    },
    [commitEmptyAs, displayValue, onBlur, onChange, value]
  );

  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...inputProps}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={inputClassName}
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </InputGroup>
  );
};
