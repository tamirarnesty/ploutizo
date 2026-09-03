/**
 * Content-profile parsing tests.
 *
 * Each fixture identifies a content profile, never a financial institution.
 * The generic positional profiles (mdy_debit_credit_balance,
 * iso_debit_credit_masked_card) must not produce any institution result.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { classifyImportRows } from '@ploutizo/utils';
import { parseImportUpload } from './index';
import type { ParseImportUploadResult, ParsedImport } from './types';
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

const requireParsed = (result: ParseImportUploadResult): ParsedImport => {
  if (result.kind === 'mapping_required') {
    throw new Error('Expected parsed import');
  }
  return result;
};

const expectMappingRequired = (
  result: ParseImportUploadResult,
  candidateProfileIds: string[]
) => {
  expect(result).toMatchObject({
    kind: 'mapping_required',
    candidateProfileIds,
  });
};

describe('parseImportUpload auto-detection — Amex', () => {
  it('auto-detects the Amex profile without institution inference', () => {
    const result = requireParsed(
      parseImportUpload(readFixture('amex', 'short.csv'))
    );

    expect(result.contentProfileId).toBe('amex');
    expect(result.rowCount).toBe(4);
  });

  it('auto-detects the extended Amex export and strips BOM', () => {
    const result = requireParsed(
      parseImportUpload(`\uFEFF${readFixture('amex', 'extended.csv')}`)
    );

    expect(result.contentProfileId).toBe('amex');
  });
});

describe('parseImportUpload — Amex', () => {
  it('normalizes signed amounts and D MMM YYYY dates', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('amex', 'short.csv'), {
        kind: 'profile',
        profileId: 'amex',
      })
    );

    expect(parsed.contentProfileId).toBe('amex');
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

  it('uses the extended export Reference as external id', () => {
    const parsed = requireParsed(
      parseImportUpload(`\uFEFF${readFixture('amex', 'extended.csv')}`, {
        kind: 'profile',
        profileId: 'amex',
      })
    );

    expect(parsed.contentProfileId).toBe('amex');
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

describe('parseImportUpload auto-detection — PC Financial', () => {
  it('auto-detects the PC Financial profile', () => {
    const result = requireParsed(
      parseImportUpload(readFixture('pc-financial', 'statement.csv'))
    );

    expect(result.contentProfileId).toBe('pc_financial');
  });
});

describe('parseImportUpload — PC Financial', () => {
  it('uses Type for direction, MM/DD/YYYY dates, and a bill-payment hint', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('pc-financial', 'statement.csv'), {
        kind: 'profile',
        profileId: 'pc_financial',
      })
    );

    expect(parsed.contentProfileId).toBe('pc_financial');
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

describe('parseImportUpload auto-detection — mdy_debit_credit_balance (generic positional)', () => {
  it('returns mapping_required without explicit selection', () => {
    const result = parseImportUpload(readFixture('td', 'statement.csv'));

    expectMappingRequired(result, ['mdy_debit_credit_balance']);
  });
});

describe('parseImportUpload — mdy_debit_credit_balance', () => {
  it('detects headerless MM/DD/YYYY debit/credit rows with no institution result', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('td', 'statement.csv'), {
        kind: 'profile',
        profileId: 'mdy_debit_credit_balance',
      })
    );

    expect(parsed.contentProfileId).toBe('mdy_debit_credit_balance');
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
    const parsed = requireParsed(
      parseImportUpload(
        [
          '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,0.00',
          '13/40/2026,BROKEN DATE,5.00,,105.00',
        ].join('\n'),
        { kind: 'profile', profileId: 'mdy_debit_credit_balance' }
      )
    );

    expect(parsed.contentProfileId).toBe('mdy_debit_credit_balance');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
  });
});

describe('parseImportUpload auto-detection — iso_debit_credit_masked_card (generic positional)', () => {
  it('returns mapping_required without explicit selection', () => {
    const result = parseImportUpload(readFixture('cibc', 'statement.csv'));

    expectMappingRequired(result, ['iso_debit_credit_masked_card']);
  });
});

describe('parseImportUpload — iso_debit_credit_masked_card', () => {
  it('detects headerless ISO debit/credit rows with no institution result', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('cibc', 'statement.csv'), {
        kind: 'profile',
        profileId: 'iso_debit_credit_masked_card',
      })
    );

    expect(parsed.contentProfileId).toBe('iso_debit_credit_masked_card');
    expect(parsed.rowCount).toBe(4);
    expect(parsed.rows.map((row) => row.parsedType)).toEqual([
      'expense',
      'refund',
      'refund',
      null,
    ]);

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
    const parsed = requireParsed(
      parseImportUpload(
        [
          '2026-05-02,NEIGHBORHOOD GROCERY,12.34,,4505********1234',
          '2026-02-30,BROKEN DATE,5.00,,4505********1234',
        ].join('\n'),
        { kind: 'profile', profileId: 'iso_debit_credit_masked_card' }
      )
    );

    expect(parsed.contentProfileId).toBe('iso_debit_credit_masked_card');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
  });
});

describe('parseImportUpload — mapping_required', () => {
  it('returns mapping_required for an unrecognized headerless file', () => {
    const result = parseImportUpload(
      readFixture('shared', 'headerless-unrecognized.csv')
    );

    expectMappingRequired(result, []);
  });

  it('returns mapping_required for a generic five-column MDY file without monetary balance', () => {
    const result = parseImportUpload(
      [
        '05/08/2026,Site inspection,4,,completed',
        '05/09/2026,Permit review,2,,in progress',
      ].join('\n')
    );

    expectMappingRequired(result, []);
  });

  it('returns mapping_required for ops-shaped rows with numeric column 5', () => {
    const result = parseImportUpload(
      [
        '05/08/2026,Site inspection,4,,100',
        '05/09/2026,Permit review,2,,102',
      ].join('\n')
    );

    expectMappingRequired(result, ['mdy_debit_credit_balance']);
  });

  it('returns mapping_required for MDY-shaped rows without monetary running balances', () => {
    const result = parseImportUpload(
      '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,not a balance'
    );

    expectMappingRequired(result, []);
  });

  it('returns mapping_required for CIBC-shaped rows with wrong masked card pattern', () => {
    const result = parseImportUpload(
      '2026-05-02,NEIGHBORHOOD GROCERY,12.34,,4505*******1234'
    );

    expectMappingRequired(result, []);
  });

  it('does not recognize mixed headerless dates as a known profile', () => {
    const result = parseImportUpload(
      readFixture('shared', 'headerless-mixed-dates.csv')
    );

    expectMappingRequired(result, []);
  });

  it('does not auto-detect a generic positional file when some rows fail the signature', () => {
    const result = parseImportUpload(
      [
        '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00',
        'not-a-date,BROKEN SIGNATURE,12.34,,100.00',
      ].join('\n')
    );

    expectMappingRequired(result, []);
  });
});

describe('parseImportUpload — confirmed generic positional selection', () => {
  it('parses a confirmed generic positional file when some rows fail the detection signature', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00',
          'not-a-date,BROKEN SIGNATURE,12.34,,100.00',
        ].join('\n'),
        { kind: 'profile', profileId: 'mdy_debit_credit_balance' }
      )
    );

    expect(parsed.contentProfileId).toBe('mdy_debit_credit_balance');
    expect(parsed.rowCount).toBe(2);
    expect(parsed.rows[0]?.parsedDate).toBe('2026-05-02');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
    expect(parsed.rows[1]?.parsedDescription).toBe('BROKEN SIGNATURE');
  });

  it('parses mixed-date headerless rows when MDY is explicitly selected', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('shared', 'headerless-mixed-dates.csv'), {
        kind: 'profile',
        profileId: 'mdy_debit_credit_balance',
      })
    );

    expect(parsed.contentProfileId).toBe('mdy_debit_credit_balance');
    expect(parsed.rows[0]?.parsedDate).toBe('2026-05-02');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
    expect(parsed.rows[1]?.parsedDescription).toBe('CORNER PHARMACY');
  });
});

describe('parseImportUpload — invalid selection', () => {
  it('rejects a profile that does not match the file', () => {
    expectImportError(
      () =>
        parseImportUpload(
          readFixture('shared', 'headerless-unrecognized.csv'),
          {
            kind: 'profile',
            profileId: 'amex',
          }
        ),
      'IMPORT_INVALID_SELECTION'
    );
  });

  it('rejects confirming MDY on an ISO-only file', () => {
    expectImportError(
      () =>
        parseImportUpload(readFixture('cibc', 'statement.csv'), {
          kind: 'profile',
          profileId: 'mdy_debit_credit_balance',
        }),
      'IMPORT_INVALID_SELECTION'
    );
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
    const parsed = requireParsed(
      parseImportUpload(readFixture('pc-financial', 'statement.csv'), {
        kind: 'profile',
        profileId: 'pc_financial',
      })
    );
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[2]).toMatchObject({
      parsedType: 'refund',
      classificationHint: 'bill_payment',
    });
    expect(classified[2]?.reviewType).toBe('settlement');
  });

  it('classifies a vault-phrase refund as settlement without a classification hint', () => {
    const parsed = requireParsed(
      parseImportUpload(readFixture('amex', 'short.csv'), {
        kind: 'profile',
        profileId: 'amex',
      })
    );
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[2]).toMatchObject({
      parsedType: 'refund',
    });
    expect(classified[2]?.reviewType).toBe('settlement');
  });

  it('does not classify an expense as settlement from its description', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,12.34,PAYMENT THANK YOU,expense',
        ].join('\n'),
        { kind: 'profile', profileId: 'internal' }
      )
    );
    const classified = classifyImportRows(parsed.rows, classificationContext);

    expect(parsed.rows[0]?.parsedType).toBe('expense');
    expect(parsed.rows[0]?.classificationHint ?? null).toBeNull();
    expect(classified[0]?.reviewType).toBe('expense');
  });
});
