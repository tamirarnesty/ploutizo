import { useCallback } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  centsToDollars,
  formatDollarsBlurDisplay,
  isIncompleteDecimalEdit,
  mergeDecimalEditPaste,
  parseCurrencyInputToCents,
  sanitizeCurrencyPaste,
  sanitizeDecimalEditString,
  tryParseDollarsFromEdit,
} from '@ploutizo/utils/currency';
import { useDecimalDisplayInput } from '@/components/currency/useDecimalDisplayInput';
import type { ComponentProps } from 'react';

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
  /**
   * When set, mid-edit empty input emits this value instead of undefined.
   * Useful with settle forms where submit may occur before blur.
   */
  commitEmptyOnChange?: number;
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
  commitEmptyOnChange,
  ...inputProps
}: CurrencyInputProps) => {
  const onMidEdit = useCallback(
    (sanitized: string) => {
      const parsed = tryParseDollarsFromEdit(sanitized);
      if (parsed !== undefined) {
        onChange(parsed);
        return;
      }
      if (
        commitEmptyOnChange !== undefined &&
        isIncompleteDecimalEdit(sanitized)
      ) {
        onChange(commitEmptyOnChange);
        return;
      }
      onChange(undefined);
    },
    [commitEmptyOnChange, onChange]
  );

  const commitOnBlur = useCallback(
    (
      display: string,
      _currentValue: number | undefined
    ): number | undefined => {
      const sanitized = sanitizeDecimalEditString(display);
      if (isIncompleteDecimalEdit(sanitized)) {
        return commitEmptyAs;
      }
      return centsToDollars(parseCurrencyInputToCents(sanitized));
    },
    [commitEmptyAs]
  );

  const { displayValue, handleChange, handlePaste, handleFocus, handleBlur } =
    useDecimalDisplayInput({
      value,
      formatBlur: formatDollarsBlurDisplay,
      formatEdit: toEditDisplay,
      sanitize: sanitizeDecimalEditString,
      onMidEdit,
      commitOnBlur,
      onChange,
      onBlur,
      mergePaste: (display, start, end, pasted) =>
        mergeDecimalEditPaste(
          display,
          start,
          end,
          pasted,
          sanitizeCurrencyPaste
        ),
    });

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
