import { useCallback, useMemo } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  centsToDollars,
  formatDollarsBlurDisplay,
  getCurrencySymbol,
  isIncompleteDecimalEdit,
  mergeDecimalEditPaste,
  parseCurrencyInputToCents,
  sanitizeCurrencyPaste,
  sanitizeDecimalEditString,
} from '@ploutizo/utils/currency';
import { useDecimalDisplayInput } from '@/components/currency/useDecimalDisplayInput';
import { useMoneyLocale } from '@/lib/money/money-locale';
import { useRegisterInputFlush } from '@/lib/money/pending-input-flush';
import type { ComponentProps, FocusEvent } from 'react';

export type CurrencyInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'onBlur' | 'type' | 'inputMode' | 'autoComplete'
> & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
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
  onFocus,
  onPaste,
  ...inputProps
}: CurrencyInputProps) => {
  const { locale, currency } = useMoneyLocale();
  const currencySymbol = useMemo(
    () => getCurrencySymbol(locale, currency),
    [currency, locale]
  );

  const commitOnBlur = useCallback(
    (
      display: string,
      _currentValue: number | undefined
    ): number | undefined => {
      const sanitized = sanitizeDecimalEditString(display, locale);
      if (isIncompleteDecimalEdit(sanitized, locale)) {
        return commitEmptyAs;
      }
      return centsToDollars(parseCurrencyInputToCents(sanitized, locale));
    },
    [commitEmptyAs, locale]
  );

  const formatBlur = useCallback(
    (dollars: number | undefined) => formatDollarsBlurDisplay(dollars, locale),
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
        sanitizeCurrencyPaste,
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
      <InputGroupAddon align="inline-start">
        <InputGroupText>{currencySymbol}</InputGroupText>
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
