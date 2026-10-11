'use client';

import { formatForDisplay } from '@tanstack/react-hotkeys';
import { FilterSubmenuContent } from './filter-submenu-content';
import { resolveHighlightedIndex } from './filters-utils';
import type { Hotkey } from '@tanstack/react-hotkeys';
import type React from 'react';

import type {
  Filter,
  FilterFieldConfig,
  FilterI18nConfig,
} from './filters-types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Input } from '@/components/input';
import { Kbd } from '@/components/kbd';
import { ScrollArea } from '@/components/scroll-area';

interface FiltersAddMenuProps<T = unknown> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerButton: React.ReactElement;
  menuPopupClassName?: string;
  showSearchInput: boolean;
  mergedI18n: FilterI18nConfig;
  rootInputRef: React.RefObject<HTMLInputElement | null>;
  rootId: string;
  menuSearchInput: string;
  onMenuSearchInputChange: (value: string) => void;
  activeMenu: string;
  onActiveMenuChange: (menu: string) => void;
  openSubMenu: string | null;
  onOpenSubMenuChange: (key: string | null) => void;
  onHighlightedIndexChange: React.Dispatch<React.SetStateAction<number>>;
  displayHighlightedIndex: number;
  addFilterOpen: boolean;
  filteredFields: FilterFieldConfig<T>[];
  enableShortcut: boolean;
  shortcutKey: Hotkey;
  onAddFilter: (fieldKey: string) => void;
  onCloseMenu: () => void;
  filters: Filter<T>[];
  sessionFilterIds: Record<string, string>;
  onSubmenuToggle: (
    fieldKey: string,
    field: FilterFieldConfig<T>,
    isMultiSelect: boolean,
    currentValues: T[],
    sessionFilter: Filter<T> | null | undefined,
    value: T,
    isSelected: boolean
  ) => void;
}

export const FiltersAddMenu = <T = unknown,>({
  open,
  onOpenChange,
  triggerButton,
  menuPopupClassName,
  showSearchInput,
  mergedI18n,
  rootInputRef,
  rootId,
  menuSearchInput,
  onMenuSearchInputChange,
  activeMenu,
  onActiveMenuChange,
  openSubMenu,
  onOpenSubMenuChange,
  onHighlightedIndexChange,
  displayHighlightedIndex,
  addFilterOpen,
  filteredFields,
  enableShortcut,
  shortcutKey,
  onAddFilter,
  onCloseMenu,
  filters,
  sessionFilterIds,
  onSubmenuToggle,
}: FiltersAddMenuProps<T>) => {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={triggerButton} />
      <DropdownMenuContent
        className={cn('w-[220px]', menuPopupClassName)}
        align="start"
      >
        {showSearchInput && (
          <>
            <div className="relative">
              <Input
                ref={rootInputRef}
                role="combobox"
                aria-controls={`${rootId}-listbox`}
                aria-activedescendant={
                  displayHighlightedIndex >= 0
                    ? `${rootId}-item-${displayHighlightedIndex}`
                    : undefined
                }
                placeholder={mergedI18n.searchFields}
                className={cn(
                  'h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none',
                  'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
                  activeMenu === 'root' && 'placeholder:text-foreground'
                )}
                value={menuSearchInput}
                onFocus={() => onActiveMenuChange('root')}
                onMouseEnter={() => onActiveMenuChange('root')}
                onBlur={() =>
                  activeMenu === 'root' && rootInputRef.current?.focus()
                }
                onChange={(e) => onMenuSearchInputChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (filteredFields.length > 0) {
                      onHighlightedIndexChange((prev) => {
                        const current = resolveHighlightedIndex(
                          prev,
                          addFilterOpen,
                          filteredFields.length
                        );
                        return current < filteredFields.length - 1
                          ? current + 1
                          : 0;
                      });
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (filteredFields.length > 0) {
                      onHighlightedIndexChange((prev) => {
                        const current = resolveHighlightedIndex(
                          prev,
                          addFilterOpen,
                          filteredFields.length
                        );
                        return current > 0
                          ? current - 1
                          : filteredFields.length - 1;
                      });
                    }
                  } else if (
                    (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
                    displayHighlightedIndex >= 0
                  ) {
                    const field = filteredFields[displayHighlightedIndex];
                    const hasSubMenu =
                      field &&
                      (field.type === 'select' ||
                        field.type === 'multiselect') &&
                      field.options?.length;

                    if (e.key === 'ArrowRight' && hasSubMenu) {
                      e.preventDefault();
                      onOpenSubMenuChange(field.key || null);
                      onActiveMenuChange(field.key || 'root');
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      if (openSubMenu) {
                        onOpenSubMenuChange(null);
                        onActiveMenuChange('root');
                      }
                    }
                  } else if (
                    e.key === 'Enter' &&
                    displayHighlightedIndex >= 0
                  ) {
                    e.preventDefault();
                    const field = filteredFields[displayHighlightedIndex];
                    if (field.key) {
                      const hasSubMenu =
                        (field.type === 'select' ||
                          field.type === 'multiselect') &&
                        field.options?.length;
                      if (!hasSubMenu) {
                        onAddFilter(field.key);
                      } else if (openSubMenu === field.key) {
                        onOpenSubMenuChange(null);
                        onActiveMenuChange('root');
                      } else {
                        onOpenSubMenuChange(field.key);
                        onActiveMenuChange(field.key);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    onCloseMenu();
                  }
                  e.stopPropagation();
                }}
              />
              {enableShortcut && (
                <Kbd className="absolute top-1/2 right-2 -translate-y-1/2 border bg-background">
                  {formatForDisplay(shortcutKey)}
                </Kbd>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <div className="relative flex max-h-full">
          <div
            className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
            role="listbox"
            id={`${rootId}-listbox`}
            onMouseEnter={() => onActiveMenuChange('root')}
          >
            <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:m-0">
              {filteredFields.length === 0 ? (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  {mergedI18n.noFieldsFound}
                </div>
              ) : (
                filteredFields.map((field, index) => {
                  const isHighlighted = displayHighlightedIndex === index;
                  const itemId = `${rootId}-item-${index}`;
                  const hasSubMenu =
                    (field.type === 'select' || field.type === 'multiselect') &&
                    field.options?.length;

                  if (hasSubMenu) {
                    const isMultiSelect = field.type === 'multiselect';
                    const fieldKey = field.key as string;
                    const sessionFilterId = sessionFilterIds[fieldKey];
                    const sessionFilter = sessionFilterId
                      ? filters.find((f) => f.id === sessionFilterId)
                      : null;
                    const currentValues = sessionFilter?.values || [];

                    return (
                      <DropdownMenuSub
                        key={fieldKey}
                        open={openSubMenu === fieldKey}
                        onOpenChange={(subOpen) => {
                          if (subOpen) {
                            onOpenSubMenuChange(fieldKey);
                          } else if (openSubMenu === fieldKey) {
                            onOpenSubMenuChange(null);
                            onActiveMenuChange('root');
                          }
                        }}
                      >
                        <DropdownMenuSubTrigger
                          id={itemId}
                          role="option"
                          aria-selected={isHighlighted}
                          data-highlighted={isHighlighted || undefined}
                          onMouseEnter={() => {
                            onHighlightedIndexChange(index);
                            onActiveMenuChange('root');
                          }}
                          className="data-highlighted:bg-accent data-highlighted:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                        >
                          {field.icon}
                          <span>{field.label}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                          className="w-[200px]"
                          side="right"
                        >
                          <FilterSubmenuContent
                            field={field}
                            currentValues={currentValues}
                            isMultiSelect={isMultiSelect}
                            i18n={mergedI18n}
                            isActive={activeMenu === fieldKey}
                            onActive={() => {
                              if (field.searchable !== false) {
                                onActiveMenuChange(fieldKey);
                              }
                            }}
                            onBack={() => {
                              onOpenSubMenuChange(null);
                              onActiveMenuChange('root');
                            }}
                            onClose={onCloseMenu}
                            onToggle={(value, isSelected) => {
                              onSubmenuToggle(
                                fieldKey,
                                field,
                                isMultiSelect,
                                currentValues,
                                sessionFilter,
                                value,
                                isSelected
                              );
                            }}
                          />
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  }

                  return (
                    <DropdownMenuItem
                      key={field.key}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => onHighlightedIndexChange(index)}
                      onClick={() => field.key && onAddFilter(field.key)}
                      className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      {field.icon}
                      <span>{field.label}</span>
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
