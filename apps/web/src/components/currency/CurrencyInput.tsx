import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrencyInput,
} from '@ploutizo/utils/currency';
import type { ChangeEvent, ClipboardEvent, FocusEvent } from 'react';

export type CurrencyInputProps = {
  id?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  className?: string;
  inputClassName?: string;
};

const filterEditString = (input: string): string => {
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

const sanitizePaste = (text: string): string =>
  filterEditString(text.replace(/[\s$,]/g, ''));

const parseEditStringToDollars = (edit: string): number | undefined => {
  if (edit === '' || edit === '.') return undefined;
  const [whole = '0', fraction = ''] = edit.split('.');
  return Number(`${whole || '0'}.${fraction}`);
};

const roundDollars = (dollars: number): number =>
  centsToDollars(dollarsToCents(dollars));

const toFormattedDisplay = (dollars: number | undefined): string => {
  if (dollars === undefined || !Number.isFinite(dollars)) return '';
  return formatCurrencyInput(dollarsToCents(dollars));
};

const toEditDisplay = (dollars: number | undefined): string => {
  if (dollars === undefined || !Number.isFinite(dollars)) return '';
  return dollars.toString();
};

const applyEditString = (
  edit: string,
  onChange: (value: number | undefined) => void
): string => {
  const next = filterEditString(edit);
  onChange(parseEditStringToDollars(next));
  return next;
};

const mergePasteIntoEdit = (
  displayValue: string,
  start: number,
  end: number,
  pastedText: string
): string =>
  filterEditString(
    displayValue.slice(0, start) +
      sanitizePaste(pastedText) +
      displayValue.slice(end)
  );

const finalizeEditOnBlur = (
  displayValue: string,
  value: number | undefined
): {
  rounded: number | undefined;
  formatted: string;
  changed: boolean;
} => {
  const parsed = parseEditStringToDollars(displayValue);
  const rounded = parsed === undefined ? undefined : roundDollars(parsed);
  return {
    rounded,
    formatted: toFormattedDisplay(rounded),
    changed: rounded !== value,
  };
};

export const CurrencyInput = ({
  id = 'currency-input',
  value,
  onChange,
  onBlur,
  className,
  inputClassName,
}: CurrencyInputProps) => {
  const focused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() =>
    toFormattedDisplay(value)
  );

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(toFormattedDisplay(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(applyEditString(e.target.value, onChange));
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const next = mergePasteIntoEdit(
        displayValue,
        start,
        end,
        e.clipboardData.getData('text')
      );
      setDisplayValue(applyEditString(next, onChange));
    },
    [displayValue, onChange]
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
      const { rounded, formatted, changed } = finalizeEditOnBlur(
        displayValue,
        value
      );
      if (changed) {
        onChange(rounded);
      }
      setDisplayValue(formatted);
      onBlur?.();
    },
    [displayValue, onBlur, onChange, value]
  );

  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
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
