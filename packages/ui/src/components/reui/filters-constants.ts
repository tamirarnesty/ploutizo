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
    is: 'Is',
    isNot: 'Is not',
    isAnyOf: 'Is any of',
    isNotAnyOf: 'Is not any of',
    includesAll: 'Includes all',
    excludesAll: 'Excludes all',
    before: 'Before',
    after: 'After',
    between: 'Between',
    notBetween: 'Not between',
    contains: 'Contains',
    notContains: 'Does not contain',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    isExactly: 'Is exactly',
    equals: 'Equals',
    notEquals: 'Does not equal',
    greaterThan: 'Greater than',
    lessThan: 'Less than',
    overlaps: 'Overlaps',
    includes: 'Includes',
    excludes: 'Excludes',
    includesAllOf: 'Includes all of',
    includesAnyOf: 'Includes any of',
    empty: 'Is empty',
    notEmpty: 'Is not empty',
  },

  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: 'Select...',
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: 'Enter key...',
    enterValue: 'Enter value...',
  },

  helpers: {
    formatOperator: (operator: string) =>
      operator.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase()),
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
