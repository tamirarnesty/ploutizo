import { FINANCIAL_INSTITUTION_IDS } from '@ploutizo/types';
import { describe, expect, it } from 'vitest';
import { buildFinancialInstitutionCatalogInsertSql } from '../financial-institution-catalog-seed';

describe('buildFinancialInstitutionCatalogInsertSql', () => {
  it('emits SQL VALUES rows for every catalog id', () => {
    expect(buildFinancialInstitutionCatalogInsertSql()).toBe(
      FINANCIAL_INSTITUTION_IDS.map((id) => `\t('${id}')`).join(',\n')
    );
  });
});
