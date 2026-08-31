import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPE_VALUES } from './enums';
import {
  FINANCIAL_INSTITUTIONS,
  FINANCIAL_INSTITUTION_IDS,
  accountRequiresFinancialInstitution,
  buildFinancialInstitutionCatalogInsertSql,
  getFinancialInstitution,
  getFinancialInstitutionName,
  isFinancialInstitutionId,
  toFinancialInstitutionId,
} from './financial-institutions';

describe('Financial institution catalog', () => {
  it('seeds Amex, CIBC, PC Financial, TD, RBC, and Wealthsimple', () => {
    expect(FINANCIAL_INSTITUTIONS).toEqual([
      { id: 'amex', name: 'Amex' },
      { id: 'cibc', name: 'CIBC' },
      { id: 'pc_financial', name: 'PC Financial' },
      { id: 'td', name: 'TD' },
      { id: 'rbc', name: 'RBC' },
      { id: 'wealthsimple', name: 'Wealthsimple' },
    ]);
    expect(FINANCIAL_INSTITUTION_IDS).toEqual([
      'amex',
      'cibc',
      'pc_financial',
      'td',
      'rbc',
      'wealthsimple',
    ]);
  });

  it('buildFinancialInstitutionCatalogInsertSql matches the catalog ids', () => {
    expect(buildFinancialInstitutionCatalogInsertSql()).toBe(
      FINANCIAL_INSTITUTION_IDS.map((id) => `\t('${id}')`).join(',\n')
    );
  });

  it('resolves catalog entries by id', () => {
    expect(getFinancialInstitution('td')).toEqual({ id: 'td', name: 'TD' });
    expect(getFinancialInstitutionName('pc_financial')).toBe('PC Financial');
    expect(getFinancialInstitution('unknown')).toBeNull();
    expect(getFinancialInstitutionName(null)).toBeNull();
    expect(isFinancialInstitutionId('amex')).toBe(true);
    expect(isFinancialInstitutionId('internal')).toBe(false);
    expect(toFinancialInstitutionId('td')).toBe('td');
    expect(toFinancialInstitutionId('internal')).toBeNull();
  });

  it('requires a Financial institution for bank-backed and investment types only', () => {
    const required = new Set([
      'credit_card',
      'chequing',
      'savings',
      'investment',
    ]);
    for (const type of ACCOUNT_TYPE_VALUES) {
      expect(accountRequiresFinancialInstitution(type)).toBe(
        required.has(type)
      );
    }
  });
});
