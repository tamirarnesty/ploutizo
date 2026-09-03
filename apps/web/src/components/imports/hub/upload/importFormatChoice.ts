import { IMPORT_CUSTOM_MAPPING_DATE_FORMATS } from '@ploutizo/types';
import type {
  ImportAmountSemantics,
  ImportContentProfileId,
  ImportContentSelection,
  ImportCustomMappingDateFormat,
} from '@ploutizo/types';

export const CUSTOM_FORMAT_CHOICE = 'custom' as const;
export const NONE_COLUMN = 'none' as const;

export type FormatChoice = ImportContentProfileId | typeof CUSTOM_FORMAT_CHOICE;

export type ImportFormatChoiceValues = {
  formatChoice: FormatChoice;
  dateColumn: string;
  dateFormat: ImportCustomMappingDateFormat;
  descriptionColumn: string;
  amountKind: ImportAmountSemantics['kind'];
  amountColumn: string;
  positiveIsExpense: boolean;
  debitColumn: string;
  creditColumn: string;
  externalIdColumn: string;
};

const columnOrFirst = (columns: string[], index: number) =>
  columns.at(index) ?? columns.at(0) ?? '';

const findColumn = (
  columns: string[],
  pattern: RegExp,
  fallbackIndex: number
) =>
  columns.find((column) => pattern.test(column)) ??
  columnOrFirst(columns, fallbackIndex);

export const createDefaultFormatChoiceValues = (
  candidateProfileIds: ImportContentProfileId[],
  columns: string[]
): ImportFormatChoiceValues => ({
  formatChoice: candidateProfileIds[0] ?? CUSTOM_FORMAT_CHOICE,
  dateColumn: findColumn(columns, /date|posted/i, 0),
  dateFormat: 'YYYY-MM-DD',
  descriptionColumn: findColumn(columns, /desc|memo|narration/i, 1),
  amountKind: 'signed',
  amountColumn: findColumn(columns, /amount|total|sum/i, 2),
  positiveIsExpense: true,
  debitColumn: findColumn(columns, /debit/i, 2),
  creditColumn: findColumn(columns, /credit/i, 3),
  externalIdColumn: NONE_COLUMN,
});

export const buildImportContentSelection = (
  value: ImportFormatChoiceValues
): ImportContentSelection => {
  if (value.formatChoice !== CUSTOM_FORMAT_CHOICE) {
    return { kind: 'profile', profileId: value.formatChoice };
  }

  return {
    kind: 'mapping',
    mapping: {
      dateColumn: value.dateColumn,
      dateFormat: value.dateFormat,
      descriptionColumn: value.descriptionColumn,
      amount:
        value.amountKind === 'signed'
          ? {
              kind: 'signed',
              column: value.amountColumn,
              positiveIsExpense: value.positiveIsExpense,
            }
          : {
              kind: 'debit_credit',
              debitColumn: value.debitColumn,
              creditColumn: value.creditColumn,
            },
      ...(value.externalIdColumn !== NONE_COLUMN
        ? { externalIdColumn: value.externalIdColumn }
        : {}),
    },
  };
};

export const formatChoiceIntro = (
  candidateProfileIds: ImportContentProfileId[]
) =>
  candidateProfileIds.length > 0
    ? 'This file matches a known layout. Confirm the format, or map columns yourself.'
    : "This file wasn't automatically recognized. Map the columns that match your CSV.";

export { IMPORT_CUSTOM_MAPPING_DATE_FORMATS };
