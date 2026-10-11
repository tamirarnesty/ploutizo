'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { SelectOptionsMenuContent } from './select-options-menu-content';
import { useFilterContext } from './filters-context';
import type { FilterFieldConfig } from './filters-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  onClose?: () => void;
  inline?: boolean;
}

export const SelectOptionsPopover = <T = unknown,>({
  field,
  values,
  onChange,
  onClose,
  inline = false,
}: SelectOptionsPopoverProps<T>) => {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const context = useFilterContext();
  const baseId = useId();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchInput, open]);

  const isMultiSelect = field.type === 'multiselect' || values.length > 1;
  const effectiveValues =
    (field.value !== undefined ? field.value : values) || [];

  const effectiveValueSet = useMemo(
    () => new Set(effectiveValues),
    [effectiveValues]
  );

  const selectedOptions =
    field.options?.filter((opt) => effectiveValueSet.has(opt.value)) || [];
  const unselectedOptions =
    field.options?.filter((opt) => !effectiveValueSet.has(opt.value)) || [];

  const filteredSelectedOptions = selectedOptions;
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase())
  );

  const allFilteredOptions = useMemo(
    () => [...filteredSelectedOptions, ...filteredUnselectedOptions],
    [filteredSelectedOptions, filteredUnselectedOptions]
  );

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const menuContent = (
    <SelectOptionsMenuContent
      field={field}
      baseId={baseId}
      open={open}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      inputRef={inputRef}
      highlightedIndex={highlightedIndex}
      onHighlightedIndexChange={setHighlightedIndex}
      isMultiSelect={isMultiSelect}
      effectiveValues={effectiveValues}
      effectiveValueSet={effectiveValueSet}
      filteredSelectedOptions={filteredSelectedOptions}
      filteredUnselectedOptions={filteredUnselectedOptions}
      allFilteredOptions={allFilteredOptions}
      onChange={onChange}
      onClose={handleClose}
    />
  );

  if (inline) {
    return <div className="w-full">{menuContent}</div>;
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setTimeout(() => setSearchInput(''), 200);
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size={context.size}>
            <div className="flex items-center gap-1.5">
              {field.customValueRenderer ? (
                field.customValueRenderer(values, field.options || [])
              ) : (
                <>
                  {selectedOptions.length > 0 && (
                    <div className="flex items-center -space-x-1.5">
                      {selectedOptions.slice(0, 3).map((option) => (
                        <div key={String(option.value)}>{option.icon}</div>
                      ))}
                    </div>
                  )}
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : selectedOptions.length > 1
                      ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                      : context.i18n.select}
                </>
              )}
            </div>
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className={cn('w-[200px] px-0', field.className)}
      >
        {menuContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
