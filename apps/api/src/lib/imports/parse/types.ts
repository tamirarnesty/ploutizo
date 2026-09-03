import type {
  ImportContentProfileId,
  ImportContentSelection,
  ImportDraftRow,
} from '@ploutizo/types';
import type { ImportClassificationHint, ImportCsvHints } from '@ploutizo/utils';

export type CsvRecord = {
  cells: string[];
  rowNumber: number;
};

export interface CsvUpload {
  /**
   * The first non-blank row's cells, lowercased and trimmed.
   * For headed layouts (Amex, PC Financial, internal) these are the column
   * names; normalizers skip `records[0]` with `.slice(1)`.
   * For headerless layouts (positional profiles) `records` contains only data
   * rows and `headers` reflects the first data row — positional normalizers
   * never consult `headers`.
   */
  headers: string[];
  /** All non-blank rows including the first row. */
  records: CsvRecord[];
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
  classificationHint?: ImportClassificationHint;
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
  /** The content profile that was used to parse this upload. */
  contentProfileId: ImportContentProfileId | null;
  rowCount: number;
  rows: ParsedImportRow[];
}

/**
 * A content profile: parsing semantics for one CSV layout.
 * Does not carry any financial-institution identity.
 */
export interface ImportContentProfile {
  profileId: ImportContentProfileId;
  matches: (upload: CsvUpload) => boolean;
  normalize: (upload: CsvUpload) => SourceImportRow[];
  parseDate: (value: string | null) => string | null;
}

export type { ImportContentSelection };
