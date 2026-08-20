import type { ImportDraftRow, ImportFormatId } from '@ploutizo/types';

export interface ParseImportHints {
  institution?: string | null;
  fileName?: string;
}

type ParsedImportRowBase = Pick<
  ImportDraftRow,
  | 'rowNumber'
  | 'rawData'
  | 'externalId'
  | 'sourceDate'
  | 'sourceAmount'
  | 'sourceDescription'
  | 'sourceType'
  | 'parsedDate'
  | 'parsedAmount'
  | 'parsedType'
  | 'parsedDescription'
  | 'reviewDate'
  | 'reviewAmount'
  | 'reviewType'
  | 'reviewDescription'
  | 'reviewRefundLinkHint'
  | 'reviewNotes'
>;

export type ParsedImportRow = ParsedImportRowBase & {
  csvCategoryName: string | null;
  csvAssigneeName: string | null;
  csvTagNames: string[];
};

export interface SourceImportRow {
  rowNumber: number;
  rawData: Record<string, string>;
  externalId: string | null;
  sourceDate: string | null;
  sourceAmount: string | null;
  sourceDescription: string | null;
  sourceType: string | null;
  csvCategoryName: string | null;
  csvAssigneeName: string | null;
  csvTagNames: string[];
  reviewRefundLinkHint: string | null;
  reviewNotes: string | null;
}

export interface ParsedImport {
  format: ImportFormatId;
  institution?: string;
  rowCount: number;
  rows: ParsedImportRow[];
}

export type CsvRecord = {
  cells: string[];
  rowNumber: number;
};

export interface CsvUpload {
  records: CsvRecord[];
}

export interface ImportNormalizer {
  format: ImportFormatId;
  matches: (upload: CsvUpload) => boolean;
  normalize: (upload: CsvUpload) => SourceImportRow[];
}
