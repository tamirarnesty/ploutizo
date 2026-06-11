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
  mergeCurrencyEditPaste,
  parseCurrencyInputToCents,
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
  const formatBlur = useCallback(
    (dollars: number | undefined) => formatDollarsBlurDisplay(dollars),
    []
  );

  const onMidEdit = useCallback(
    (sanitized: string) => {
      const parsed = tryParseDollarsFromEdit(sanitized);
      if (parsed !== undefined) {
        onChange(parsed);
        return;
      }
      if (
        commitEmptyOnChange !== undefined &&
        (!sanitized || sanitized === '.')
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
      if (!sanitized || sanitized === '.') {
        return commitEmptyAs;
      }
      return centsToDollars(parseCurrencyInputToCents(display));
    },
    [commitEmptyAs]
  );

  const { displayValue, handleChange, handlePaste, handleFocus, handleBlur } =
    useDecimalDisplayInput({
      value,
      formatBlur,
      formatEdit: toEditDisplay,
      sanitize: sanitizeDecimalEditString,
      onMidEdit,
      commitOnBlur,
      onChange,
      onBlur,
      mergePaste: mergeCurrencyEditPaste,
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
