import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { classifyImportRows } from '@ploutizo/utils';
import { parseImportUpload } from './index';
import { DomainError } from '@/lib/errors';

const banksDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/banks'
);

const readFixture = (...relativePath: string[]) =>
  readFileSync(join(banksDir, ...relativePath), 'utf8');

const expectImportError = (fn: () => unknown, code: string) => {
  try {
    fn();
    throw new Error('Expected parser to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
};

describe('parseImportUpload — Amex', () => {
  it('detects the short export and normalizes signed amounts and D MMM YYYY dates', () => {
    const parsed = parseImportUpload(readFixture('amex', 'short.csv'));

    expect(parsed.detectedInstitutionId).toBe('amex');
    expect(parsed.rowCount).toBe(4);
    expect(parsed.rows.map((row) => row.parsedType)).toEqual([
      'expense',
      'refund',
      'refund',
      'expense',
    ]);
    expect(parsed.rows.some((row) => row.parsedType === 'settlement')).toBe(
      false
    );

    expect(parsed.rows[0]).toMatchObject({
      sourceDate: '2 May 2026',
      parsedDate: '2026-05-02',
      sourceAmount: '12.34',
      parsedAmount: 1234,
      parsedType: 'expense',
      parsedDescription: 'NEIGHBORHOOD GROCERY',
      csvAssigneeName: 'Pat Nomatch',
    });
    expect(parsed.rows[1]).toMatchObject({
      sourceDate: '8 May 2026',
      parsedDate: '2026-05-08',
      sourceAmount: '5.00',
      parsedAmount: 500,
      parsedType: 'refund',
      parsedDescription: 'RETURNED CHARGER',
    });
    expect(parsed.rows[2]).toMatchObject({
      parsedDate: '2026-05-15',
      parsedAmount: 5000,
      parsedType: 'refund',
      parsedDescription: 'PAYMENT RECEIVED - THANK YOU',
    });
    expect(parsed.rows[3]).toMatchObject({
      sourceDate: '32 Foo 2026',
      parsedDate: null,
      parsedDescription: 'BROKEN DATE ROW',
    });
  });

  it('detects the extended export, strips BOM, and uses Reference as external id', () => {
    const parsed = parseImportUpload(
      `\uFEFF${readFixture('amex', 'extended.csv')}`
    );

    expect(parsed.detectedInstitutionId).toBe('amex');
    expect(parsed.rowCount).toBe(4);
    expect(parsed.rows[0]).toMatchObject({
      externalId: 'AMEX-REF-0001',
      parsedDate: '2026-05-02',
      parsedAmount: 1234,
      parsedType: 'expense',
      csvAssigneeName: 'Ada Example',
    });
    expect(parsed.rows[0]?.rawData.Reference).toBe("'AMEX-REF-0001");
    expect(parsed.rows[1]).toMatchObject({
      parsedType: 'refund',
      parsedAmount: 500,
      parsedDescription: 'MERCHANT CREDIT',
    });
    expect(parsed.rows[2]).toMatchObject({
      parsedType: 'refund',
      parsedDescription: 'PAYMENT RECEIVED - THANK YOU',
    });
    expect(parsed.rows[3]).toMatchObject({
      parsedAmount: null,
      parsedDescription: 'MISSING AMOUNT',
    });
    expect(parsed.rows.some((row) => row.parsedType === 'settlement')).toBe(
      false
    );
  });
});

describe('parseImportUpload — PC Financial', () => {
  it('uses Type for direction, MM/DD/YYYY dates, and a bill-payment hint', () => {
    const parsed = parseImportUpload(
      readFixture('pc-financial', 'statement.csv')
    );

    expect(parsed.detectedInstitutionId).toBe('pc_financial');
    expect(parsed.rowCount).toBe(5);
    expect(parsed.rows.map((row) => row.parsedType)).toEqual([
      'expense',
      'expense',
      'refund',
      null,
      'expense',
    ]);
    expect(parsed.rows.some((row) => row.parsedType === 'settlement')).toBe(
      false
    );

    expect(parsed.rows[0]).toMatchObject({
      sourceDate: '05/02/2026',
      parsedDate: '2026-05-02',
      sourceAmount: '12.34',
      parsedAmount: 1234,
      parsedType: 'expense',
      parsedDescription: 'NEIGHBORHOOD GROCERY',
      sourceType: 'expense',
    });
    expect(parsed.rows[1]).toMatchObject({
      parsedDate: '2026-05-08',
      parsedAmount: 125,
      parsedType: 'expense',
      sourceType: 'expense',
    });
    expect(parsed.rows[2]).toMatchObject({
      parsedDate: '2026-05-15',
      parsedAmount: 5000,
      parsedType: 'refund',
      sourceType: 'refund',
      parsedDescription: 'PC FINANCIAL PAYMENT THANK YOU',
      classificationHint: 'bill_payment',
    });
    expect(parsed.rows[3]).toMatchObject({
      sourceType: 'FEE',
      parsedType: null,
      parsedDescription: 'ANNUAL FEE',
    });
    expect(parsed.rows[4]).toMatchObject({
      sourceDate: '13/40/2026',
      parsedDate: null,
      parsedType: 'expense',
    });
  });
});

describe('parseImportUpload — TD', () => {
  it('detects headerless MM/DD/YYYY debit/credit rows', () => {
    const parsed = parseImportUpload(readFixture('td', 'statement.csv'));

    expect(parsed.detectedInstitutionId).toBe('td');
    expect(parsed.rowCount).toBe(4);
    expect(parsed.rows.map((row) => row.parsedType)).toEqual([
      'expense',
      'refund',
      'refund',
      null,
    ]);
    expect(parsed.rows.some((row) => row.parsedType === 'settlement')).toBe(
      false
    );

    expect(parsed.rows[0]).toMatchObject({
      sourceDate: '05/02/2026',
      parsedDate: '2026-05-02',
      parsedAmount: 1234,
      parsedType: 'expense',
      parsedDescription: 'NEIGHBORHOOD GROCERY',
    });
    expect(parsed.rows[1]).toMatchObject({
      parsedDate: '2026-05-08',
      parsedAmount: 500,
      parsedType: 'refund',
      parsedDescription: 'MERCHANT CREDIT',
    });
    expect(parsed.rows[2]).toMatchObject({
      parsedDate: '2026-05-15',
      parsedAmount: 5000,
      parsedType: 'refund',
      parsedDescription: 'PAYMENT - THANK YOU',
    });
    expect(parsed.rows[3]).toMatchObject({
      parsedType: null,
      parsedDescription: 'BROKEN DEBIT CREDIT',
    });
  });

  it('accepts a zero running balance and keeps an invalid date as a row error', () => {
    const parsed = parseImportUpload(
      [
        '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,0.00',
        '13/40/2026,BROKEN DATE,5.00,,105.00',
      ].join('\n')
    );

    expect(parsed.detectedInstitutionId).toBe('td');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
  });
});

describe('parseImportUpload — CIBC', () => {
  it('detects headerless ISO debit/credit rows', () => {
    const parsed = parseImportUpload(readFixture('cibc', 'statement.csv'));

    expect(parsed.detectedInstitutionId).toBe('cibc');
    expect(parsed.rowCount).toBe(4);
    expect(parsed.rows.map((row) => row.parsedType)).toEqual([
      'expense',
      'refund',
      'refund',
      null,
    ]);
    expect(parsed.rows.some((row) => row.parsedType === 'settlement')).toBe(
      false
    );

    expect(parsed.rows[0]).toMatchObject({
      sourceDate: '2026-05-02',
      parsedDate: '2026-05-02',
      parsedAmount: 1234,
      parsedType: 'expense',
      parsedDescription: 'NEIGHBORHOOD GROCERY',
    });
    expect(parsed.rows[2]).toMatchObject({
      parsedDate: '2026-05-15',
      parsedType: 'refund',
      parsedDescription: 'PAIEMENT MERCI',
    });
    expect(parsed.rows[3]).toMatchObject({
      parsedType: null,
      parsedDescription: 'BROKEN DEBIT CREDIT',
    });
  });

  it('keeps an ISO-shaped but calendar-invalid date as an invalid row', () => {
    const parsed = parseImportUpload(
      [
        '2026-05-02,NEIGHBORHOOD GROCERY,12.34,,4505********1234',
        '2026-02-30,BROKEN DATE,5.00,,4505********1234',
      ].join('\n')
    );

    expect(parsed.detectedInstitutionId).toBe('cibc');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
  });
});

describe('parseImportUpload — Import file failures', () => {
  it('rejects an unrecognized headerless file', () => {
    expectImportError(
      () =>
        parseImportUpload(readFixture('shared', 'headerless-unrecognized.csv')),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('rejects a generic five-column MDY file without a TD balance signature', () => {
    expectImportError(
      () =>
        parseImportUpload(
          [
            '05/08/2026,Site inspection,4,,completed',
            '05/09/2026,Permit review,2,,in progress',
          ].join('\n')
        ),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('rejects TD-shaped rows without monetary running balances', () => {
    expectImportError(
      () =>
        parseImportUpload(
          '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,not a balance'
        ),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('rejects CIBC-shaped rows with the wrong masked card number', () => {
    expectImportError(
      () =>
        parseImportUpload(
          '2026-05-02,NEIGHBORHOOD GROCERY,12.34,,4505*******1234'
        ),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('does not detect mixed headerless dates as TD or CIBC', () => {
    try {
      parseImportUpload(readFixture('shared', 'headerless-mixed-dates.csv'));
      throw new Error('Expected parser to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(['IMPORT_FILE_UNRECOGNIZED', 'IMPORT_FILE_AMBIGUOUS']).toContain(
        (error as DomainError).code
      );
    }
  });
});

describe('parseImportUpload → classifyImportRows', () => {
  const classificationContext = {
    catalogs: {
      categories: [
        { id: 'cat-bill-payment', name: BILL_PAYMENT_CATEGORY_NAME },
      ],
      tags: [],
      members: [],
    },
    merchantRules: [],
    accountOwnerMemberIds: [],
  };

  it('classifies a PC payment hint as settlement when the description is not a vault phrase', () => {
    const parsed = parseImportUpload(
      readFixture('pc-financial', 'statement.csv')
    );
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[2]).toMatchObject({
      parsedType: 'refund',
      classificationHint: 'bill_payment',
    });
    expect(classified[2]?.reviewType).toBe('settlement');
  });

  it('classifies a vault-phrase refund as settlement without a classification hint', () => {
    const parsed = parseImportUpload(readFixture('amex', 'short.csv'));
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[2]).toMatchObject({
      parsedType: 'refund',
    });
    expect(classified[2]?.reviewType).toBe('settlement');
  });

  it('does not classify an expense as settlement from its description', () => {
    const parsed = parseImportUpload(
      [
        'date,amount,description,type',
        '2026-05-02,12.34,PAYMENT THANK YOU,expense',
      ].join('\n')
    );
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[0]?.parsedType).toBe('expense');
    expect(parsed.rows[0]?.classificationHint ?? null).toBeNull();
    expect(classified[0]?.reviewType).toBe('expense');
  });
});
