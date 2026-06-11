import { useCallback } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import {
  mergePercentEditPaste,
  sanitizeDecimalEditString,
} from '@ploutizo/utils/currency';
import { useDecimalDisplayInput } from '@/components/currency/useDecimalDisplayInput';
import type { ComponentProps } from 'react';

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

const roundToOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10;

const toBlurDisplay = (percentage: number): string =>
  roundToOneDecimal(percentage).toFixed(1);

const toEditDisplay = (percentage: number): string => percentage.toString();

export const PercentInput = ({
  value,
  onChange,
  onBlur,
  className,
  inputClassName,
  ...inputProps
}: PercentInputProps) => {
  const formatBlur = useCallback(
    (percentage: number) => toBlurDisplay(percentage),
    []
  );

  const onMidEdit = useCallback(
    (sanitized: string) => {
      const parsed = parseFloat(sanitized);
      if (Number.isFinite(parsed)) {
        onChange(parsed);
      }
    },
    [onChange]
  );

  const commitOnBlur = useCallback(
    (display: string, currentValue: number): number => {
      const sanitized = sanitizeDecimalEditString(display);
      if (!sanitized || sanitized === '.') {
        return currentValue;
      }
      const parsed = parseFloat(sanitized);
      if (!Number.isFinite(parsed)) {
        return currentValue;
      }
      return roundToOneDecimal(parsed);
    },
    []
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
      mergePaste: mergePercentEditPaste,
    });

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
