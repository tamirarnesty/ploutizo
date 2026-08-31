import type { AccountType } from './enums';

export const FINANCIAL_INSTITUTION_IDS = [
  'amex',
  'cibc',
  'pc_financial',
  'td',
  'rbc',
  'wealthsimple',
] as const;

export type FinancialInstitutionId = (typeof FINANCIAL_INSTITUTION_IDS)[number];

export const FINANCIAL_INSTITUTION_NAMES = {
  amex: 'Amex',
  cibc: 'CIBC',
  pc_financial: 'PC Financial',
  td: 'TD',
  rbc: 'RBC',
  wealthsimple: 'Wealthsimple',
} as const satisfies Record<FinancialInstitutionId, string>;

export const FINANCIAL_INSTITUTIONS = FINANCIAL_INSTITUTION_IDS.map((id) => ({
  id,
  name: FINANCIAL_INSTITUTION_NAMES[id],
}));

export type FinancialInstitution = (typeof FINANCIAL_INSTITUTIONS)[number];

/** SQL VALUES clause for seeding `financial_institutions` — ids only, names live in types. */
export const buildFinancialInstitutionCatalogInsertSql = (): string =>
  FINANCIAL_INSTITUTION_IDS.map((id) => `\t('${id}')`).join(',\n');

/** Account types that must have a Financial institution on create/edit. */
export const INSTITUTION_REQUIRED_ACCOUNT_TYPES = [
  'credit_card',
  'chequing',
  'savings',
  'investment',
] as const satisfies readonly AccountType[];

export const isFinancialInstitutionId = (
  value: string | null | undefined
): value is FinancialInstitutionId =>
  value != null &&
  (FINANCIAL_INSTITUTION_IDS as readonly string[]).includes(value);

export const toFinancialInstitutionId = (
  value: string | null | undefined
): FinancialInstitutionId | null =>
  isFinancialInstitutionId(value) ? value : null;

export const getFinancialInstitution = (
  id: string | null | undefined
): FinancialInstitution | null =>
  FINANCIAL_INSTITUTIONS.find((institution) => institution.id === id) ?? null;

export const getFinancialInstitutionName = (
  id: string | null | undefined
): string | null => getFinancialInstitution(id)?.name ?? null;

export const accountRequiresFinancialInstitution = (
  type: AccountType
): boolean =>
  (INSTITUTION_REQUIRED_ACCOUNT_TYPES as readonly AccountType[]).includes(type);

export interface InstitutionMismatchWarning {
  detectedInstitutionId: FinancialInstitutionId;
  accountInstitutionId: FinancialInstitutionId;
}
