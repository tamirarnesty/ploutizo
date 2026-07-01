import type {
  ImportBatchStatus,
  ImportRowStatus,
  ImportTransactionType,
} from './enums';

export interface ImportTargetAccount {
  id: string;
  name: string;
  institution: string | null;
  lastFour: string | null;
}

export interface ImportDraftSummary {
  id: string;
  accountId: string;
  accountName: string;
  accountInstitution: string | null;
  accountLastFour: string | null;
  source: string;
  status: ImportBatchStatus;
  fileName: string | null;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  importedAt: string;
  completedAt: string | null;
  discardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDraftRow {
  id: string;
  batchId: string;
  rowNumber: number;
  status: ImportRowStatus;
  invalidReason: string | null;
  rawData: Record<string, string>;
  externalId: string | null;
  sourceDate: string | null;
  sourceAmount: string | null;
  sourceDescription: string | null;
  sourceType: string | null;
  parsedDate: string | null;
  parsedAmount: number | null;
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
  reviewDate: string | null;
  reviewAmount: number | null;
  reviewType: ImportTransactionType | null;
  reviewDescription: string | null;
  reviewCategoryName: string | null;
  reviewAssigneeHint: string | null;
  reviewRefundLinkHint: string | null;
  reviewNotes: string | null;
  reviewTags: string[];
  selectedForImport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDraft extends ImportDraftSummary {
  rows: ImportDraftRow[];
}
