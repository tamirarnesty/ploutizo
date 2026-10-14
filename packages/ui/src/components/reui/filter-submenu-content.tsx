'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { resolveHighlightedIndex } from './filters-utils';
import type { FilterFieldConfig, FilterI18nConfig } from './filters-types';
import { cn } from '@/lib/utils';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/dropdown-menu';
import { Input } from '@/components/input';
import { ScrollArea } from '@/components/scroll-area';

interface FilterSubmenuContentProps<T = unknown> {
  field: FilterFieldConfig<T>;
  currentValues: T[];
  isMultiSelect: boolean;
  onToggle: (value: T, isSelected: boolean) => void;
  i18n: FilterI18nConfig;
  isActive?: boolean;
  onActive?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const FilterSubmenuContent = <T = unknown,>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
  i18n,
  isActive,
  onActive,
  onBack,
  onClose,
}: FilterSubmenuContentProps<T>) => {
  const [searchInput, setSearchInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const currentValueSet = useMemo(
    () => new Set(currentValues),
    [currentValues]
  );

  useEffect(() => {
    if (isActive) {
      if (field.searchable !== false) {
        inputRef.current?.focus();
      } else {
        const listbox = document.getElementById(`${baseId}-listbox`);
        listbox?.focus();
      }
    }
  }, [isActive, field.searchable, baseId]);

  const filteredOptions = useMemo(() => {
    return (
      field.options?.filter((option) => {
        const isSelected = currentValueSet.has(option.value);
        if (isSelected) return true;
        if (!searchInput) return true;
        return option.label.toLowerCase().includes(searchInput.toLowerCase());
      }) || []
    );
  }, [field.options, searchInput, currentValueSet]);

  const displayHighlightedIndex = resolveHighlightedIndex(
    highlightedIndex,
    Boolean(isActive),
    filteredOptions.length
  );

  useEffect(() => {
    if (displayHighlightedIndex >= 0 && isActive) {
      const element = document.getElementById(
        `${baseId}-item-${displayHighlightedIndex}`
      );
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [displayHighlightedIndex, isActive, baseId]);

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              displayHighlightedIndex >= 0
                ? `${baseId}-item-${displayHighlightedIndex}`
                : undefined
            }
            placeholder={i18n.placeholders.searchField(field.label || '')}
            className={cn(
              'h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none',
              'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
              isActive && 'placeholder:text-foreground'
            )}
            value={searchInput}
            onBlur={() => isActive && inputRef.current?.focus()}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setHighlightedIndex(-1);
            }}
            onFocus={() => onActive?.()}
            onMouseEnter={(e) => {
              onActive?.();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      Boolean(isActive),
                      filteredOptions.length
                    );
                    return current < filteredOptions.length - 1
                      ? current + 1
                      : 0;
                  });
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      Boolean(isActive),
                      filteredOptions.length
                    );
                    return current > 0
                      ? current - 1
                      : filteredOptions.length - 1;
                  });
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onBack?.();
              } else if (e.key === 'Enter' && displayHighlightedIndex >= 0) {
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                const option = filteredOptions[displayHighlightedIndex];
                if (option) {
                  onToggle(option.value, currentValueSet.has(option.value));
                  if (!isMultiSelect) {
                    onBack?.();
                  }
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
              }
              e.stopPropagation();
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          role="listbox"
          id={`${baseId}-listbox`}
          tabIndex={field.searchable === false ? 0 : -1}
          onKeyDown={(e) => {
            if (field.searchable === false) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      Boolean(isActive),
                      filteredOptions.length
                    );
                    return current < filteredOptions.length - 1
                      ? current + 1
                      : 0;
                  });
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      Boolean(isActive),
                      filteredOptions.length
                    );
                    return current > 0
                      ? current - 1
                      : filteredOptions.length - 1;
                  });
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onBack?.();
              } else if (e.key === 'Enter' && displayHighlightedIndex >= 0) {
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                const option = filteredOptions[displayHighlightedIndex];
                if (option) {
                  onToggle(option.value, currentValueSet.has(option.value));
                  if (!isMultiSelect) {
                    onBack?.();
                  }
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
              }
              e.stopPropagation();
            }
          }}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {i18n.noResultsFound}
              </div>
            ) : (
              <DropdownMenuGroup>
                {filteredOptions.map((option, index) => {
                  const isSelected = currentValueSet.has(option.value);
                  const isHighlighted = displayHighlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      checked={isSelected}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault();
                      }}
                      onCheckedChange={() => onToggle(option.value, isSelected)}
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
