import { useCallback } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import {
  formatPercentBlurDisplay,
  isIncompleteDecimalEdit,
  mergeDecimalEditPaste,
  roundPercentToOneDecimal,
  sanitizeDecimalEditString,
  sanitizePercentPaste,
  tryParsePercentFromEdit,
} from '@ploutizo/utils/currency';
import { useDecimalDisplayInput } from '@/components/currency/useDecimalDisplayInput';
import { useMoneyLocale } from '@/lib/money/money-locale';
import { useRegisterInputFlush } from '@/lib/money/pending-input-flush';
import type { ComponentProps, FocusEvent } from 'react';

export type PercentInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'onBlur' | 'type' | 'inputMode' | 'autoComplete'
> & {
  value: number;
  onChange: (value: number) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
};

const toEditDisplay = (percentage: number): string => percentage.toString();

export const PercentInput = ({
  value,
  onChange,
  onBlur,
  className,
  inputClassName,
  onFocus,
  onPaste,
  ...inputProps
}: PercentInputProps) => {
  const { locale } = useMoneyLocale();

  const commitOnBlur = useCallback(
    (display: string, currentValue: number): number => {
      const sanitized = sanitizeDecimalEditString(display, locale);
      if (isIncompleteDecimalEdit(sanitized, locale)) {
        return currentValue;
      }
      const parsed = tryParsePercentFromEdit(sanitized, locale);
      if (parsed === undefined) {
        return currentValue;
      }
      return roundPercentToOneDecimal(parsed);
    },
    [locale]
  );

  const formatBlur = useCallback(
    (percent: number) => formatPercentBlurDisplay(percent, locale),
    [locale]
  );

  const sanitize = useCallback(
    (input: string) => sanitizeDecimalEditString(input, locale),
    [locale]
  );

  const mergePaste = useCallback(
    (display: string, start: number, end: number, pasted: string) =>
      mergeDecimalEditPaste(
        display,
        start,
        end,
        pasted,
        sanitizePercentPaste,
        locale
      ),
    [locale]
  );

  const {
    displayValue,
    handleChange,
    handlePaste,
    handleFocus,
    handleBlur,
    flushPending,
  } = useDecimalDisplayInput({
    value,
    formatBlur,
    formatEdit: toEditDisplay,
    sanitize,
    commitOnBlur,
    onChange,
    onBlur,
    onFocus,
    onPaste,
    mergePaste,
  });

  useRegisterInputFlush(flushPending);

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
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </InputGroup>
  );
};
