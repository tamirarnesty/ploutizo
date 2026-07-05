export const NORMALIZED_IMPORT_SOURCE = 'ploutizo_normalized' as const;

export const MAX_NORMALIZED_IMPORT_BYTES = 512 * 1024;

export const MAX_NORMALIZED_IMPORT_ROWS = 1_000;

export const NORMALIZED_IMPORT_REQUIRED_COLUMNS = [
  'date',
  'amount',
  'description',
  'type',
] as const;

export const NORMALIZED_IMPORT_OPTIONAL_COLUMNS = [
  'external id',
  'category',
  'assignee hint',
  'refund link hints',
  'notes',
  'tags',
] as const;

export const NORMALIZED_IMPORT_FORMAT_RULES: readonly (readonly [
  string,
  string,
])[] = [
  ['date', 'Use YYYY-MM-DD.'],
  ['amount', 'Use a positive dollar value, such as 42.18.'],
  ['description', 'Use the merchant or statement description.'],
  ['type', 'Use expense, refund, or settlement.'],
  ['tags', 'Separate multiple tags with semicolons.'],
];

export const NORMALIZED_IMPORT_EXAMPLE_CSV = [
  'date,amount,description,type,external id,category,assignee hint,refund link hints,notes,tags',
  '2026-05-02,42.18,Neighborhood Grocery,expense,visa-1001,Groceries,Ada,,Weekly shop,food; errands',
  '2026-05-08,14.99,Returned Charger,refund,visa-1002,Household,Ada,visa-0911,Returned item,',
  '2026-05-15,250.00,Payment Thank You,settlement,visa-1003,,,chequing payment,Statement payment,',
].join('\n');
