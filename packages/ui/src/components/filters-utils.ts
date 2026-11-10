import { DEFAULT_I18N, createOperatorsFromI18n } from './filters-constants';
import {
  type Filter,
  type FilterFieldConfig,
  type FilterFieldGroup,
  type FilterFieldsConfig,
  type FilterI18nConfig,
  type FilterOperator,
} from './filters-types';

export const isFieldGroup = <T = unknown>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>
): item is FilterFieldGroup<T> => {
  return 'fields' in item && Array.isArray(item.fields);
};

export const isGroupLevelField = <T = unknown>(
  field: FilterFieldConfig<T>
): boolean => {
  return Boolean(field.group && field.fields);
};

export const flattenFields = <T = unknown>(
  fields: FilterFieldsConfig<T>
): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) {
      acc.push(...item.fields);
      return acc;
    }
    if (isGroupLevelField(item)) {
      acc.push(...item.fields!);
      return acc;
    }
    acc.push(item);
    return acc;
  }, []);
};

export const getFieldsMap = <T = unknown>(
  fields: FilterFieldsConfig<T>
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields);
  return flatFields.reduce(
    (acc, field) => {
      if (field.key) {
        acc[field.key] = field;
      }
      return acc;
    },
    {} as Record<string, FilterFieldConfig<T>>
  );
};

export const getOperatorsForField = <T = unknown>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) return field.operators;

  const operators = createOperatorsFromI18n(i18n);

  let fieldType = field.type || 'select';

  if (fieldType === 'select' && values.length > 1) {
    fieldType = 'multiselect';
  }

  if (fieldType === 'multiselect' || field.type === 'multiselect') {
    return operators.multiselect;
  }

  return operators[fieldType] ?? operators.select;
};

export const getDefaultFilterOperator = <T = unknown>(
  field: FilterFieldConfig<T>
): string =>
  field.defaultOperator || (field.type === 'multiselect' ? 'is_any_of' : 'is');

export const createPinnedFilterId = (fieldKey: string): string =>
  `filter-${fieldKey}`;

export const isFilterValueActive = <T = unknown>(
  filter: Filter<T>
): boolean => {
  if (filter.operator === 'empty' || filter.operator === 'not_empty') {
    return true;
  }
  return filter.values.some((value) => String(value ?? '').trim().length > 0);
};

const EMPTY_VALUE_OPERATORS = new Set(['empty', 'not_empty']);

/** Short human summary of a filter's values ("Chase", "3 selected" style joins). */
export const getFilterValueSummary = <T = unknown>(
  filter: Filter<T>,
  field: FilterFieldConfig<T>,
  i18n: FilterI18nConfig,
  emptyLabel = 'Any'
): string => {
  if (EMPTY_VALUE_OPERATORS.has(filter.operator)) {
    return (
      getOperatorsForField(field, filter.values, i18n).find(
        (op) => op.value === filter.operator
      )?.label ?? i18n.helpers.formatOperator(filter.operator)
    );
  }
  if (filter.values.length === 0) return emptyLabel;
  const labels = filter.values.map(
    (value) =>
      field.options?.find((option) => option.value === value)?.label ??
      String(value)
  );
  return labels.join(', ');
};

/** "Label-ish" summary including a non-default operator prefix ("Is not Chase"). */
export const getFilterSummary = <T = unknown>(
  filter: Filter<T>,
  field: FilterFieldConfig<T>,
  i18n: FilterI18nConfig,
  emptyLabel = 'Any'
): string => {
  const valueSummary = getFilterValueSummary(filter, field, i18n, emptyLabel);
  if (EMPTY_VALUE_OPERATORS.has(filter.operator)) return valueSummary;
  if (filter.operator === getDefaultFilterOperator(field)) {
    return valueSummary;
  }
  const operatorLabel =
    getOperatorsForField(field, filter.values, i18n).find(
      (op) => op.value === filter.operator
    )?.label ?? i18n.helpers.formatOperator(filter.operator);
  return `${operatorLabel} ${valueSummary}`;
};

const stripUndefined = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;

export const mergeFilterI18n = (
  i18n?: Partial<FilterI18nConfig>
): FilterI18nConfig => {
  if (!i18n) {
    return DEFAULT_I18N;
  }

  const defined = stripUndefined(i18n);

  return {
    ...DEFAULT_I18N,
    ...defined,
    operators: {
      ...DEFAULT_I18N.operators,
      ...(defined.operators ?? {}),
    },
    placeholders: {
      ...DEFAULT_I18N.placeholders,
      ...(defined.placeholders ?? {}),
    },
    helpers: {
      ...DEFAULT_I18N.helpers,
      ...(defined.helpers ?? {}),
    },
    validation: {
      ...DEFAULT_I18N.validation,
      ...(defined.validation ?? {}),
    },
  };
};
