import type {
  ImportContentProfileId,
  ImportDraftRow,
  ImportUploadMappingRequired,
} from '@ploutizo/types';
import type { ImportClassificationHint, ImportCsvHints } from '@ploutizo/utils';

export type CsvRecord = {
  cells: string[];
  rowNumber: number;
};

export interface CsvUpload {
  /**
   * Column lookup keys. Headed files use the first row's trimmed cells;
   * headerless files use `Column N`. Headed normalizers skip `records[0]`.
   * Headerless normalizers treat every record as data and ignore `headers`.
   */
  headers: string[];
  /** True when the first non-blank row is column names, not a data row. */
  hasHeaderRow: boolean;
  /** All non-blank rows, including a header row when `hasHeaderRow` is true. */
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
  kind: 'parsed';
  /** The content profile that was used to parse this upload. */
  contentProfileId: ImportContentProfileId | null;
  rowCount: number;
  rows: ParsedImportRow[];
}

export type ParseImportUploadResult =
  | ParsedImport
  | ImportUploadMappingRequired;

/**
 * A content profile: parsing semantics for one CSV layout.
 * Does not carry any financial-institution identity.
 */
export interface ImportContentProfile {
  profileId: ImportContentProfileId;
  /** Strict detection: used to auto-detect or suggest this profile. */
  matches: (upload: CsvUpload) => boolean;
  /**
   * Member-confirmed selection: the file can be parsed as this layout.
   * Headed profiles use the same check as `matches`. Headerless profiles
   * accept a minority of signature failures as Invalid import rows.
   */
  acceptsSelection: (upload: CsvUpload) => boolean;
  normalize: (upload: CsvUpload) => SourceImportRow[];
  parseDate: (value: string | null) => string | null;
}
