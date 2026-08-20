import type { ImportDraftRow, ImportFormatId } from '@ploutizo/types';
import type { ImportCsvHints } from '@ploutizo/utils';

export interface ParseImportHints {
  institution?: string | null;
  fileName?: string;
}

export type CsvRecord = {
  cells: string[];
  rowNumber: number;
};

export interface CsvUpload {
  headers: string[];
  dataRecords: CsvRecord[];
}

/** Adapter output: canonical source fields plus optional format-specific extras. */
export interface SourceImportRow {
  rowNumber: number;
  rawData: Record<string, string>;
  externalId: string | null;
  sourceDate: string | null;
  sourceAmount: string | null;
  sourceDescription: string | null;
  sourceType: string | null;
  hints?: ImportCsvHints;
  reviewRefundLinkHint?: string | null;
  reviewNotes?: string | null;
}

export type ParsedImportRow = Omit<
  SourceImportRow,
  'hints' | 'reviewRefundLinkHint' | 'reviewNotes'
> &
  ImportCsvHints &
  Pick<
    ImportDraftRow,
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

export interface ParsedImport {
  format: ImportFormatId;
  institution?: string;
  rowCount: number;
  rows: ParsedImportRow[];
}

export interface ImportNormalizer {
  format: ImportFormatId;
  matches: (upload: CsvUpload) => boolean;
  normalize: (upload: CsvUpload) => SourceImportRow[];
}
