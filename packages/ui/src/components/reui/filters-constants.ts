import { type FilterI18nConfig, type FilterOperator } from './filters-types';

export const DEFAULT_I18N: FilterI18nConfig = {
  addFilter: 'Filter',
  searchFields: 'Filter...',
  noFieldsFound: 'No filters found.',
  noResultsFound: 'No results found.',
  select: 'Select...',
  true: 'True',
  false: 'False',
  min: 'Min',
  max: 'Max',
  to: 'to',
  typeAndPressEnter: 'Type and press Enter to add tag',
  selected: 'selected',
  selectedCount: 'selected',
  percent: '%',
  defaultCurrency: '$',
  defaultColor: '#000000',
  addFilterTitle: 'Add filter',

  operators: {
    is: 'is',
    isNot: 'is not',
    isAnyOf: 'is any of',
    isNotAnyOf: 'is not any of',
    includesAll: 'includes all',
    excludesAll: 'excludes all',
    before: 'before',
    after: 'after',
    between: 'between',
    notBetween: 'not between',
    contains: 'contains',
    notContains: 'does not contain',
    startsWith: 'starts with',
    endsWith: 'ends with',
    isExactly: 'is exactly',
    equals: 'equals',
    notEquals: 'not equals',
    greaterThan: 'greater than',
    lessThan: 'less than',
    overlaps: 'overlaps',
    includes: 'includes',
    excludes: 'excludes',
    includesAllOf: 'includes all of',
    includesAnyOf: 'includes any of',
    empty: 'is empty',
    notEmpty: 'is not empty',
  },

  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: 'Select...',
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: 'Enter key...',
    enterValue: 'Enter value...',
  },

  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, ' '),
  },

  validation: {
    invalidEmail: 'Invalid email format',
    invalidUrl: 'Invalid URL format',
    invalidTel: 'Invalid phone format',
    invalid: 'Invalid input format',
  },
};

export const createOperatorsFromI18n = (
  i18n: FilterI18nConfig
): Record<string, FilterOperator[]> => ({
  select: [
    { value: 'is', label: i18n.operators.is },
    { value: 'is_not', label: i18n.operators.isNot },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: 'is_any_of', label: i18n.operators.isAnyOf },
    { value: 'is_not_any_of', label: i18n.operators.isNotAnyOf },
    { value: 'includes_all', label: i18n.operators.includesAll },
    { value: 'excludes_all', label: i18n.operators.excludesAll },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  text: [
    { value: 'contains', label: i18n.operators.contains },
    { value: 'not_contains', label: i18n.operators.notContains },
    { value: 'starts_with', label: i18n.operators.startsWith },
    { value: 'ends_with', label: i18n.operators.endsWith },
    { value: 'is', label: i18n.operators.isExactly },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
  custom: [
    { value: 'is', label: i18n.operators.is },
    { value: 'after', label: i18n.operators.after },
    { value: 'is', label: i18n.operators.is },
    { value: 'between', label: i18n.operators.between },
    { value: 'empty', label: i18n.operators.empty },
    { value: 'not_empty', label: i18n.operators.notEmpty },
  ],
});

export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N);

export const EMPTY_PINNED_FIELD_KEYS: string[] = [];
