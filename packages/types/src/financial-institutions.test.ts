import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPE_VALUES } from './enums';
import {
  accountRequiresFinancialInstitution,
  getFinancialInstitution,
  getFinancialInstitutionName,
  isFinancialInstitutionId,
  toFinancialInstitutionId,
} from './financial-institutions';

describe('Financial institution catalog', () => {
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
