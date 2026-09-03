export const INTERNAL_IMPORT_FORMAT = 'internal' as const;

export type ImportFormatId = typeof INTERNAL_IMPORT_FORMAT;

// ---------------------------------------------------------------------------
// Content profiles
// ---------------------------------------------------------------------------

export const IMPORT_CONTENT_PROFILE_IDS = [
  'internal',
  'amex',
  'pc_financial',
  'mdy_debit_credit_balance',
  'iso_debit_credit_masked_card',
] as const;

export type ImportContentProfileId =
  (typeof IMPORT_CONTENT_PROFILE_IDS)[number];

export const isImportContentProfileId = (
  value: unknown
): value is ImportContentProfileId =>
  IMPORT_CONTENT_PROFILE_IDS.includes(value as ImportContentProfileId);

/** Headerless positional layouts — match only after explicit member selection. */
export const GENERIC_POSITIONAL_IMPORT_PROFILE_IDS = [
  'mdy_debit_credit_balance',
  'iso_debit_credit_masked_card',
] as const satisfies readonly ImportContentProfileId[];

export type GenericPositionalImportProfileId =
  (typeof GENERIC_POSITIONAL_IMPORT_PROFILE_IDS)[number];

/** Profiles offered when auto-detection cannot pick a single match. */
export const CHOOSABLE_IMPORT_CONTENT_PROFILE_IDS =
  IMPORT_CONTENT_PROFILE_IDS.filter(
    (profileId): profileId is Exclude<ImportContentProfileId, 'internal'> =>
      profileId !== 'internal'
  );

export const IMPORT_CONTENT_PROFILE_LABELS: Record<
  ImportContentProfileId,
  string
> = {
  internal: 'Ploutizo normalized',
  amex: 'Amex',
  pc_financial: 'PC Financial',
  mdy_debit_credit_balance: 'Generic: MM/DD/YYYY debit/credit/balance',
  iso_debit_credit_masked_card: 'Generic: ISO date debit/credit/masked card',
};

// ---------------------------------------------------------------------------
// V1 custom mapping date formats
// ---------------------------------------------------------------------------

export const IMPORT_CUSTOM_MAPPING_DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
] as const;

export type ImportCustomMappingDateFormat =
  (typeof IMPORT_CUSTOM_MAPPING_DATE_FORMATS)[number];

// ---------------------------------------------------------------------------
// Content selection (submitted by member after inspection)
// ---------------------------------------------------------------------------

export type ImportAmountSemantics =
  | { kind: 'signed'; positiveIsExpense: boolean }
  | { kind: 'debit_credit'; debitColumn: string; creditColumn: string };

export interface ImportCustomMapping {
  dateColumn: string;
  dateFormat: ImportCustomMappingDateFormat;
  descriptionColumn: string;
  amount: ImportAmountSemantics;
  externalIdColumn?: string;
}

export type ImportContentSelection =
  | { kind: 'profile'; profileId: ImportContentProfileId }
  | { kind: 'mapping'; mapping: ImportCustomMapping };

export type ImportUploadMappingRequired = { kind: 'mapping_required' };

export const MAX_IMPORT_BYTES = 512 * 1024;

export const MAX_IMPORT_ROWS = 1_000;

export const INTERNAL_IMPORT_REQUIRED_COLUMNS = [
  'date',
  'amount',
  'description',
  'type',
] as const;

export const INTERNAL_IMPORT_OPTIONAL_COLUMNS = [
  'external id',
  'category',
  'assignee hint',
  'refund link hints',
  'notes',
  'tags',
] as const;

export const INTERNAL_IMPORT_FORMAT_RULES: readonly (readonly [
  string,
  string,
])[] = [
  ['date', 'Use YYYY-MM-DD.'],
  ['amount', 'Use a positive dollar value, such as 42.18.'],
  ['description', 'Use the merchant or statement description.'],
  ['type', 'Use expense, refund, or settlement.'],
  ['tags', 'Separate multiple tags with semicolons.'],
];

export const INTERNAL_IMPORT_EXAMPLE_CSV = [
  'date,amount,description,type,external id,category,assignee hint,refund link hints,notes,tags',
  '2026-05-02,42.18,Neighborhood Grocery,expense,visa-1001,Groceries,Ada,,Weekly shop,food; errands',
  '2026-05-08,14.99,Returned Charger,refund,visa-1002,Household,Ada,visa-0911,Returned item,',
  '2026-05-15,250.00,Payment Thank You,settlement,visa-1003,,,chequing payment,Statement payment,',
].join('\n');
