import { useEffect, useRef, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import { formatCurrency, parseCurrencyInput } from '@ploutizo/utils/currency';

interface FormattedAmountInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  onBlur: () => void;
  id?: string;
}

const format = (dollars: number): string =>
  formatCurrency(parseCurrencyInput(String(dollars))).replace(/[^\d.,+-]/g, '');

export const FormattedAmountInput = ({
  value,
  onChange,
  onBlur,
  id = 'tx-amount',
}: FormattedAmountInputProps) => {
  const focused = useRef(false);
  const [displayValue, setDisplayValue] = useState(
    value !== undefined && Number.isFinite(value) ? format(value) : ''
  );

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(
        value !== undefined && Number.isFinite(value) ? format(value) : ''
      );
    }
  }, [value]);

  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplayValue(raw);
          if (raw.trim() === '') {
            onChange(undefined);
            return;
          }
          try {
            onChange(parseCurrencyInput(raw) / 100);
          } catch {
            return;
          }
        }}
        onFocus={() => {
          focused.current = true;
          setDisplayValue(
            value !== undefined && Number.isFinite(value)
              ? value.toString()
              : ''
          );
        }}
        onBlur={() => {
          focused.current = false;
          onBlur();
          setDisplayValue(
            value !== undefined && Number.isFinite(value) ? format(value) : ''
          );
        }}
      />
    </InputGroup>
  );
};
