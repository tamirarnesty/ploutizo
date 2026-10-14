'use client';

import { useFilterContext } from './filters-context';
import { resolveHighlightedIndex } from './filters-utils';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { FilterFieldConfig, FilterOption } from './filters-types';
import { cn } from '@/lib/utils';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/dropdown-menu';
import { Input } from '@/components/input';
import { ScrollArea } from '@/components/scroll-area';

interface SelectOptionsMenuContentProps<T = unknown> {
  field: FilterFieldConfig<T>;
  baseId: string;
  open: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  highlightedIndex: number;
  onHighlightedIndexChange: Dispatch<SetStateAction<number>>;
  isMultiSelect: boolean;
  effectiveValues: T[];
  effectiveValueSet: Set<T>;
  filteredSelectedOptions: FilterOption<T>[];
  filteredUnselectedOptions: FilterOption<T>[];
  allFilteredOptions: FilterOption<T>[];
  onChange: (values: T[]) => void;
  onClose: () => void;
}

export const SelectOptionsMenuContent = <T = unknown,>({
  field,
  baseId,
  open,
  searchInput,
  onSearchInputChange,
  inputRef,
  highlightedIndex,
  onHighlightedIndexChange,
  isMultiSelect,
  effectiveValues,
  effectiveValueSet,
  filteredSelectedOptions,
  filteredUnselectedOptions,
  allFilteredOptions,
  onChange,
  onClose,
}: SelectOptionsMenuContentProps<T>) => {
  const context = useFilterContext();

  const displayHighlightedIndex = resolveHighlightedIndex(
    highlightedIndex,
    open,
    allFilteredOptions.length
  );

  const applySelection = (next: T[], closeOnSelect: boolean) => {
    if (field.onValueChange) {
      field.onValueChange(next);
    } else {
      onChange(next);
    }
    if (closeOnSelect) {
      onClose();
    }
  };

  return (
    <>
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
            placeholder={context.i18n.placeholders.searchField(
              field.label || ''
            )}
            className={cn(
              'h-8 rounded-none border-0 border-input bg-transparent! px-2 text-sm shadow-none',
              'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
              open && 'placeholder:text-foreground'
            )}
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onBlur={() => open && inputRef.current?.focus()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (allFilteredOptions.length > 0) {
                  onHighlightedIndexChange((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      open,
                      allFilteredOptions.length
                    );
                    return current < allFilteredOptions.length - 1
                      ? current + 1
                      : 0;
                  });
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (allFilteredOptions.length > 0) {
                  onHighlightedIndexChange((prev) => {
                    const current = resolveHighlightedIndex(
                      prev,
                      open,
                      allFilteredOptions.length
                    );
                    return current > 0
                      ? current - 1
                      : allFilteredOptions.length - 1;
                  });
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'Enter' && displayHighlightedIndex >= 0) {
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                const option = allFilteredOptions[displayHighlightedIndex];
                if (option) {
                  const isSelected = effectiveValueSet.has(option.value);
                  const next = isSelected
                    ? effectiveValues.filter((v) => v !== option.value)
                    : isMultiSelect
                      ? ([...effectiveValues, option.value] as T[])
                      : ([option.value] as T[]);

                  if (
                    !isSelected &&
                    isMultiSelect &&
                    field.maxSelections &&
                    next.length > field.maxSelections
                  ) {
                    return;
                  }

                  applySelection(next, !isMultiSelect);
                }
              }
              e.stopPropagation();
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
          role="listbox"
          id={`${baseId}-listbox`}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {allFilteredOptions.length === 0 && (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {context.i18n.noResultsFound}
              </div>
            )}

            {filteredSelectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredSelectedOptions.map((option, index) => {
                  const isHighlighted = displayHighlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => onHighlightedIndexChange(index)}
                      checked={true}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault();
                      }}
                      onCheckedChange={() => {
                        applySelection(
                          effectiveValues.filter((v) => v !== option.value),
                          !isMultiSelect
                        );
                      }}
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}

            {filteredSelectedOptions.length > 0 &&
              filteredUnselectedOptions.length > 0 && (
                <DropdownMenuSeparator className="mx-0" />
              )}

            {filteredUnselectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredUnselectedOptions.map((option, index) => {
                  const overallIndex = index + filteredSelectedOptions.length;
                  const isHighlighted =
                    displayHighlightedIndex === overallIndex;
                  const itemId = `${baseId}-item-${overallIndex}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() =>
                        onHighlightedIndexChange(overallIndex)
                      }
                      checked={false}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault();
                      }}
                      onCheckedChange={() => {
                        const next = isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[]);

                        if (
                          isMultiSelect &&
                          field.maxSelections &&
                          next.length > field.maxSelections
                        ) {
                          return;
                        }

                        applySelection(next, !isMultiSelect);
                      }}
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
    </>
  );
};
