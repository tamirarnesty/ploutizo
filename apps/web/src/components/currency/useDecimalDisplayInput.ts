import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FocusEvent } from 'react';

export type DecimalDisplayInputConfig<T> = {
  value: T;
  formatBlur: (value: T) => string;
  formatEdit: (value: T) => string;
  sanitize: (input: string) => string;
  onMidEdit: (sanitized: string) => void;
  commitOnBlur: (displayValue: string, currentValue: T) => T;
  onChange: (value: T) => void;
  onBlur?: () => void;
  mergePaste?: (
    display: string,
    start: number,
    end: number,
    pasted: string
  ) => string;
};

export const useDecimalDisplayInput = <T>({
  value,
  formatBlur,
  formatEdit,
  sanitize,
  onMidEdit,
  commitOnBlur,
  onChange,
  onBlur,
  mergePaste,
}: DecimalDisplayInputConfig<T>) => {
  const focused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() => formatBlur(value));

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(formatBlur(value));
    }
  }, [value, formatBlur]);

  const applyEditString = useCallback(
    (edit: string): string => {
      const next = sanitize(edit);
      onMidEdit(next);
      return next;
    },
    [sanitize, onMidEdit]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(applyEditString(e.target.value));
    },
    [applyEditString]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      if (!mergePaste) return;

      e.preventDefault();
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      setDisplayValue(
        applyEditString(
          mergePaste(displayValue, start, end, e.clipboardData.getData('text'))
        )
      );
    },
    [applyEditString, displayValue, mergePaste]
  );

  const handleFocus = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      focused.current = true;
      setDisplayValue(formatEdit(value));
    },
    [formatEdit, value]
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      focused.current = false;
      const committed = commitOnBlur(displayValue, value);
      const formatted = formatBlur(committed);
      if (committed !== value) {
        onChange(committed);
      }
      setDisplayValue(formatted);
      onBlur?.();
    },
    [commitOnBlur, displayValue, formatBlur, onBlur, onChange, value]
  );

  return {
    displayValue,
    handleChange,
    handlePaste: mergePaste ? handlePaste : undefined,
    handleFocus,
    handleBlur,
  };
};
