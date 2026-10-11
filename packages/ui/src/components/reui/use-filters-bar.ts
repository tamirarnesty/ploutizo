'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type Hotkey, useHotkey } from '@tanstack/react-hotkeys';

import { EMPTY_PINNED_FIELD_KEYS } from './filters-constants';
import {
  createFilter,
  createPinnedFilterId,
  flattenFields,
  getDefaultFilterOperator,
  getFieldsMap,
  mergeFilterI18n,
  resolveHighlightedIndex,
} from './filters-utils';
import {
  type Filter,
  type FilterFieldsConfig,
  type FilterI18nConfig,
} from './filters-types';

export interface UseFiltersBarOptions<T = unknown> {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
  i18n?: Partial<FilterI18nConfig>;
  allowMultiple?: boolean;
  enableShortcut?: boolean;
  shortcutKey?: Hotkey;
  pinnedFieldKeys?: string[];
  getPinnedFilterId?: (fieldKey: string) => string;
}

export const useFiltersBar = <T = unknown>({
  filters,
  fields,
  onChange,
  i18n,
  allowMultiple = true,
  enableShortcut = false,
  shortcutKey = 'F',
  pinnedFieldKeys = EMPTY_PINNED_FIELD_KEYS,
  getPinnedFilterId = createPinnedFilterId,
}: UseFiltersBarOptions<T>) => {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [menuSearchInput, setMenuSearchInput] = useState('');
  const [activeMenu, setActiveMenu] = useState<string>('root');
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null
  );
  const rootInputRef = useRef<HTMLInputElement>(null);
  const rootId = useId();

  const [sessionFilterIds, setSessionFilterIds] = useState<
    Record<string, string>
  >({});

  useHotkey(
    shortcutKey,
    () => {
      setAddFilterOpen(true);
    },
    {
      enabled: enableShortcut && !addFilterOpen,
      meta: { name: 'Add filter' },
    }
  );

  useEffect(() => {
    if (addFilterOpen && activeMenu === 'root') {
      rootInputRef.current?.focus();
    }
  }, [addFilterOpen, activeMenu]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [menuSearchInput]);

  useEffect(() => {
    if (!addFilterOpen) {
      setOpenSubMenu(null);
    }
  }, [addFilterOpen]);

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedFilterId]);

  const mergedI18n = useMemo(() => mergeFilterI18n(i18n), [i18n]);
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);
  const pinnedFieldKeySet = useMemo(
    () => new Set(pinnedFieldKeys),
    [pinnedFieldKeys]
  );

  const resolvePinnedFilter = useCallback(
    (fieldKey: string): Filter<T> | null => {
      const field = fieldsMap[fieldKey];
      const existing = filters.find((filter) => filter.field === fieldKey);
      if (existing) return existing;
      return {
        id: getPinnedFilterId(fieldKey),
        field: fieldKey,
        operator: getDefaultFilterOperator(field),
        values: [] as T[],
      };
    },
    [fieldsMap, filters, getPinnedFilterId]
  );

  const resetPinnedFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      const emptyFilter: Filter<T> = {
        id: getPinnedFilterId(fieldKey),
        field: fieldKey,
        operator: getDefaultFilterOperator(field),
        values: [] as T[],
      };
      const hasPinned = filters.some((filter) => filter.field === fieldKey);
      if (!hasPinned) {
        if (!pinnedFieldKeySet.has(fieldKey)) return;
        onChange([...filters, emptyFilter]);
        return;
      }
      onChange(
        filters.map((filter) =>
          filter.field === fieldKey ? emptyFilter : filter
        )
      );
    },
    [fieldsMap, filters, getPinnedFilterId, onChange, pinnedFieldKeySet]
  );

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      const existing = filters.find((filter) => filter.id === filterId);
      if (existing) {
        onChange(
          filters.map((filter) => {
            if (filter.id !== filterId) return filter;
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === 'empty' ||
              updates.operator === 'not_empty'
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          })
        );
        return;
      }

      const pinnedFieldKey = pinnedFieldKeys.find(
        (fieldKey) => getPinnedFilterId(fieldKey) === filterId
      );
      if (!pinnedFieldKey) return;

      const field = fieldsMap[pinnedFieldKey];

      const updatedFilter: Filter<T> = {
        id: getPinnedFilterId(pinnedFieldKey),
        field: pinnedFieldKey,
        operator: getDefaultFilterOperator(field),
        values: [] as T[],
        ...updates,
      };
      if (updates.operator === 'empty' || updates.operator === 'not_empty') {
        updatedFilter.values = [] as T[];
      }
      onChange([...filters, updatedFilter]);
    },
    [fieldsMap, filters, getPinnedFilterId, onChange, pinnedFieldKeys]
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange]
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (field.key) {
        const defaultValues: unknown[] = field.type === 'text' ? [''] : [];
        const newFilter = createFilter<T>(
          fieldKey,
          getDefaultFilterOperator(field),
          defaultValues as T[]
        );
        setLastAddedFilterId(newFilter.id);
        onChange([...filters, newFilter]);
        setAddFilterOpen(false);
        setMenuSearchInput('');
      }
    },
    [fieldsMap, filters, onChange]
  );

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields);
    return flatFields.filter((field) => {
      if (!field.key || field.type === 'separator') return false;
      if (pinnedFieldKeySet.has(field.key)) return false;
      if (allowMultiple) return true;
      return !filters.some((filter) => filter.field === field.key);
    });
  }, [fields, filters, allowMultiple, pinnedFieldKeySet]);

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase())
    );
  }, [selectableFields, menuSearchInput]);

  const displayHighlightedIndex = resolveHighlightedIndex(
    highlightedIndex,
    addFilterOpen,
    filteredFields.length
  );

  useEffect(() => {
    if (displayHighlightedIndex >= 0 && addFilterOpen) {
      const element = document.getElementById(
        `${rootId}-item-${displayHighlightedIndex}`
      );
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [displayHighlightedIndex, addFilterOpen, rootId]);

  const trailingFilters = useMemo(
    () => filters.filter((filter) => !pinnedFieldKeySet.has(filter.field)),
    [filters, pinnedFieldKeySet]
  );

  const handleAddFilterOpenChange = useCallback(
    (open: boolean) => {
      setAddFilterOpen(open);
      if (!open) {
        setMenuSearchInput('');
        setSessionFilterIds({});
        setHighlightedIndex(-1);
      } else {
        setActiveMenu('root');
        if (filteredFields.length > 0) {
          setHighlightedIndex(0);
        }
      }
    },
    [filteredFields.length]
  );

  const handleSubmenuToggle = useCallback(
    (
      fieldKey: string,
      field: { defaultOperator?: string },
      isMultiSelect: boolean,
      currentValues: T[],
      sessionFilter: Filter<T> | null | undefined,
      value: T,
      isSelected: boolean
    ) => {
      if (isMultiSelect) {
        const nextValues = isSelected
          ? currentValues.filter((v) => v !== value)
          : ([...currentValues, value] as T[]);

        if (sessionFilter) {
          if (nextValues.length === 0) {
            onChange(filters.filter((f) => f.id !== sessionFilter.id));
            setSessionFilterIds((prev) => ({
              ...prev,
              [fieldKey]: '',
            }));
          } else {
            onChange(
              filters.map((f) =>
                f.id === sessionFilter.id ? { ...f, values: nextValues } : f
              )
            );
          }
        } else {
          const newFilter = createFilter<T>(
            fieldKey,
            field.defaultOperator || 'is_any_of',
            nextValues
          );
          onChange([...filters, newFilter]);
          setSessionFilterIds((prev) => ({
            ...prev,
            [fieldKey]: newFilter.id,
          }));
        }
      } else {
        const newFilter = createFilter<T>(
          fieldKey,
          field.defaultOperator || 'is',
          [value] as T[]
        );
        setLastAddedFilterId(newFilter.id);
        onChange([...filters, newFilter]);
        setAddFilterOpen(false);
      }
    },
    [filters, onChange]
  );

  return {
    mergedI18n,
    fieldsMap,
    pinnedFieldKeys,
    resolvePinnedFilter,
    resetPinnedFilter,
    updateFilter,
    removeFilter,
    addFilter,
    selectableFields,
    filteredFields,
    trailingFilters,
    lastAddedFilterId,
    addFilterOpen,
    setAddFilterOpen,
    menuSearchInput,
    setMenuSearchInput,
    activeMenu,
    setActiveMenu,
    openSubMenu,
    setOpenSubMenu,
    highlightedIndex,
    setHighlightedIndex,
    displayHighlightedIndex,
    rootInputRef,
    rootId,
    sessionFilterIds,
    handleAddFilterOpenChange,
    handleSubmenuToggle,
    enableShortcut,
    shortcutKey,
    filters,
    onChange,
  };
};
