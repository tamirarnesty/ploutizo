'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { useFilterContext } from './filters-context';
import type React from 'react';

import type { FilterFieldConfig } from './filters-types';
import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

export const FilterInput = <T = unknown,>({
  field,
  onBlur,
  onKeyDown,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  field?: FilterFieldConfig<T>;
}) => {
  const context = useFilterContext();
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [props.autoFocus]);

  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true;
    const regex = new RegExp(pattern);
    return regex.test(value);
  };

  const getValidationMessage = (): string => {
    return context.i18n.validation.invalid;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pattern = field?.pattern || props.pattern;

    if (value && (pattern || field?.validation)) {
      let valid = true;
      let customMessage = '';

      if (field?.validation) {
        const result = field.validation(value);
        if (typeof result === 'boolean') {
          valid = result;
        } else {
          valid = result.valid;
          customMessage = result.message || '';
        }
      } else if (pattern) {
        valid = validateInput(value, pattern);
      }

      setIsValid(valid);
      setValidationMessage(
        valid ? '' : customMessage || getValidationMessage()
      );
    } else {
      setIsValid(true);
      setValidationMessage('');
    }

    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !isValid &&
      ![
        'Tab',
        'Escape',
        'Enter',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.key)
    ) {
      setIsValid(true);
      setValidationMessage('');
    }

    onKeyDown?.(e);
  };

  return (
    <InputGroup
      className={cn(
        'w-36',
        context.size == 'sm' && 'h-7!',
        context.size == 'default' && 'h-8!',
        context.size == 'lg' && 'h-9!',
        className
      )}
    >
      {field?.prefix && (
        <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        ref={inputRef}
        aria-invalid={!isValid}
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key || 'input'}-error`
            : undefined
        }
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          context.size == 'sm' && 'h-7! text-xs',
          context.size == 'default' && 'h-8!',
          context.size == 'lg' && 'h-9!'
        )}
        {...props}
      />
      {!isValid && validationMessage && (
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InputGroupButton size="icon-xs" />}>
              <AlertCircleIcon className="size-3.5 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{validationMessage}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      )}

      {field?.suffix && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
};
