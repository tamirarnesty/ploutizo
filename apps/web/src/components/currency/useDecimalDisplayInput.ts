import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FocusEvent } from 'react';

export type DecimalDisplayInputConfig<T> = {
  value: T;
  formatBlur: (value: T) => string;
  formatEdit: (value: T) => string;
  sanitize: (input: string) => string;
  commitOnBlur: (displayValue: string, currentValue: T) => T;
  onChange: (value: T) => void;
  onBlur?: () => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
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
  commitOnBlur,
  onChange,
  onBlur,
  onFocus,
  onPaste,
  mergePaste,
}: DecimalDisplayInputConfig<T>) => {
  const focused = useRef(false);
  const displayValueRef = useRef('');
  const [displayValue, setDisplayValue] = useState(() => formatBlur(value));

  displayValueRef.current = displayValue;

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(formatBlur(value));
    }
  }, [value, formatBlur]);

  const commitDisplay = useCallback(
    (display: string) => {
      const committed = commitOnBlur(display, value);
      const formatted = formatBlur(committed);
      if (committed !== value) {
        onChange(committed);
      }
      setDisplayValue(formatted);
      return committed;
    },
    [commitOnBlur, formatBlur, onChange, value]
  );

  const flushPending = useCallback(() => {
    if (!focused.current) return;
    commitDisplay(displayValueRef.current);
  }, [commitDisplay]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(sanitize(e.target.value));
    },
    [sanitize]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e);
      if (e.defaultPrevented || !mergePaste) return;

      e.preventDefault();
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const currentDisplay = input.value;
      setDisplayValue(
        sanitize(
          mergePaste(
            currentDisplay,
            start,
            end,
            e.clipboardData.getData('text')
          )
        )
      );
    },
    [mergePaste, onPaste, sanitize]
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      focused.current = true;
      setDisplayValue(formatEdit(value));
      onFocus?.(e);
    },
    [formatEdit, onFocus, value]
  );

  const handleBlur = useCallback(() => {
    focused.current = false;
    commitDisplay(displayValueRef.current);
    onBlur?.();
  }, [commitDisplay, onBlur]);

  return {
    displayValue,
    handleChange,
    handlePaste: onPaste || mergePaste ? handlePaste : undefined,
    handleFocus,
    handleBlur,
    flushPending,
  };
};
