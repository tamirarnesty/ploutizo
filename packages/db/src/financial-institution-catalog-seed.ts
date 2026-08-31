import { FINANCIAL_INSTITUTION_IDS } from '@ploutizo/types';

/** SQL VALUES rows for seeding `financial_institutions` from catalog ids. */
export const buildFinancialInstitutionCatalogInsertSql = (): string =>
  FINANCIAL_INSTITUTION_IDS.map((id) => `\t('${id}')`).join(',\n');
