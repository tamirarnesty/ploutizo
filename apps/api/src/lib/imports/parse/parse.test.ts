import { describe, expect, it, vi } from 'vitest';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '@ploutizo/types';
import type { ImportContentSelection } from '@ploutizo/types';
import { parseImportUpload } from './index';
import type { ParseImportUploadResult, ParsedImport } from './types';
import { DomainError } from '@/lib/errors';

const internalSelection: ImportContentSelection = {
  kind: 'profile',
  profileId: 'internal',
};

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

describe('parseImportUpload auto-detection', () => {
  it('auto-detects a valid internal CSV', () => {
    const result = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,42.18,Coffee,expense',
        ].join('\n')
      )
    );

    expect(result.contentProfileId).toBe('internal');
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.parsedDescription).toBe('Coffee');
  });

  it('rejects an unrecognized headed CSV', () => {
    expectImportError(
      () => parseImportUpload('posted,total,memo\n2026-05-02,42,Coffee'),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('rejects a header-only CSV without data rows', () => {
    expectImportError(
      () => parseImportUpload('a,b,c\n,,,'),
      'IMPORT_FILE_EMPTY'
    );
    expectImportError(() => parseImportUpload('a,b,c'), 'IMPORT_FILE_EMPTY');
  });

  it('returns mapping_required when multiple profiles auto-detect', async () => {
    const registry = await import('./normalizers/registry');
    const { amexContentProfile } = await import('./normalizers/amex');
    const { internalContentProfile } = await import('./normalizers/internal');
    const spy = vi
      .spyOn(registry, 'findAutoDetectableProfiles')
      .mockReturnValue([amexContentProfile, internalContentProfile]);

    const result = parseImportUpload(
      'date,amount,description,type\n2026-05-02,42.18,Coffee,expense'
    );

    expect(result).toMatchObject({ kind: 'mapping_required' });
    spy.mockRestore();
  });
});

describe('parseImportUpload', () => {
  it('keeps unparseable rows as durable facts when at least one row is importable', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type,external id,category,notes,tags',
          '2026-05-02,42.18,Neighborhood Grocery,expense,visa-1001,Groceries,Weekly shop,food; errands',
          'not-a-date,nope,,charge,visa-1002,,,',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.contentProfileId).toBe('internal');
    expect(parsed.rowCount).toBe(2);
    expect(parsed).not.toHaveProperty('validRowCount');
    expect(parsed).not.toHaveProperty('invalidRowCount');
    expect(parsed.rows[0]).toMatchObject({
      parsedAmount: 4218,
      parsedDescription: 'Neighborhood Grocery',
      reviewDescription: null,
      csvCategoryName: 'Groceries',
      csvTagNames: ['food', 'errands'],
      rawData: {
        date: '2026-05-02',
        amount: '42.18',
        description: 'Neighborhood Grocery',
      },
    });
    expect(parsed.rows[0]).not.toHaveProperty('status');
    expect(parsed.rows[0]).not.toHaveProperty('invalidReason');
    expect(parsed.rows[1]).toMatchObject({
      parsedDate: null,
      parsedAmount: null,
      parsedType: null,
      parsedDescription: null,
      reviewDate: null,
      reviewAmount: null,
      reviewType: null,
      reviewDescription: null,
    });
    expect(parsed.rows[1]).not.toHaveProperty('status');
    expect(parsed.rows[1]).not.toHaveProperty('invalidReason');
  });

  it('leaves review type and description for upload-time classification', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,42.18,Coffee,expense',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[0]).toMatchObject({
      parsedDate: '2026-05-02',
      parsedAmount: 4218,
      parsedType: 'expense',
      parsedDescription: 'Coffee',
      reviewDate: '2026-05-02',
      reviewAmount: 4218,
      reviewType: null,
      reviewDescription: null,
      csvCategoryName: null,
    });
    expect(parsed.rows[0]).not.toHaveProperty('status');
  });

  it('parses only ISO dates on the internal profile', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,42.18,Coffee,expense',
          '05/08/2026,5.00,Tea,expense',
          '8 May 2026,1.00,Water,expense',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[0]?.parsedDate).toBe('2026-05-02');
    expect(parsed.rows[1]?.sourceDate).toBe('05/08/2026');
    expect(parsed.rows[1]?.parsedDate).toBeNull();
    expect(parsed.rows[2]?.sourceDate).toBe('8 May 2026');
    expect(parsed.rows[2]?.parsedDate).toBeNull();
  });

  it('trims surrounding apostrophes from external ids', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type,external id',
          "2026-05-02,42.18,Coffee,expense,'AMEX-12345",
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[0]?.externalId).toBe('AMEX-12345');
  });

  it('parses RFC-escaped quotes in fields', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,42.18,"12"" pizza",expense',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[0]?.sourceDescription).toBe('12" pizza');
  });

  it('rejects a profile selection that does not match the file', () => {
    expectImportError(
      () =>
        parseImportUpload('posted,total,memo\n2026-05-02,42,Coffee', {
          kind: 'profile',
          profileId: 'internal',
        }),
      'IMPORT_INVALID_SELECTION'
    );
  });

  it('rejects corrupt CSV with an unclosed quoted field', () => {
    expectImportError(
      () =>
        parseImportUpload(
          'date,amount,description,type\n2026-05-02,42.18,"Coffee,expense',
          internalSelection
        ),
      'IMPORT_FILE_CORRUPT'
    );
  });

  it('rejects corrupt CSV with trailing characters after a quoted field', () => {
    expectImportError(
      () =>
        parseImportUpload(
          'date,amount,description,type\n2026-05-02,42.18,"Coffee"x,expense',
          internalSelection
        ),
      'IMPORT_FILE_CORRUPT'
    );
  });

  it('rejects unquoted interior quotes as corrupt CSV', () => {
    expectImportError(
      () =>
        parseImportUpload(
          'date,amount,description,type\n2026-05-02,42.18,12" pizza,expense',
          internalSelection
        ),
      'IMPORT_FILE_CORRUPT'
    );
  });

  it('keeps malformed grouped amount tokens as unparsed facts', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,42.18,Coffee,expense',
          '2026-05-03,"12,34.56",Tea,expense',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[1].parsedAmount).toBeNull();
    expect(parsed.rows[1].reviewAmount).toBeNull();
  });

  it('parses dollar amounts and keeps misplaced dollar signs unparsed', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          'date,amount,description,type',
          '2026-05-02,$42.18,Coffee,expense',
          '2026-05-03,12$34.56,Tea,expense',
          '2026-05-04,$$42.00,Water,expense',
        ].join('\n'),
        internalSelection
      )
    );

    expect(parsed.rows[0].parsedAmount).toBe(4218);
    expect(parsed.rows[1].parsedAmount).toBeNull();
    expect(parsed.rows[2].parsedAmount).toBeNull();
  });

  it('rejects truly empty CSV files', () => {
    expectImportError(
      () => parseImportUpload('  \n\n', internalSelection),
      'IMPORT_FILE_EMPTY'
    );
  });

  it('rejects files with only a header row and no data rows', () => {
    expectImportError(
      () =>
        parseImportUpload('date,amount,description,type', internalSelection),
      'IMPORT_FILE_EMPTY'
    );
  });

  it('rejects files over the import size limit', () => {
    expectImportError(
      () =>
        parseImportUpload('a'.repeat(MAX_IMPORT_BYTES + 1), internalSelection),
      'IMPORT_FILE_TOO_LARGE'
    );
  });

  it('rejects files over the import row limit', () => {
    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      () => '2026-05-02,1.00,Coffee,expense'
    );
    expectImportError(
      () =>
        parseImportUpload(
          ['date,amount,description,type', ...rows].join('\n'),
          internalSelection
        ),
      'IMPORT_FILE_TOO_LARGE'
    );
  });

  it('rejects headerless files over the import row limit', () => {
    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      () => '05/02/2026,Coffee,1.00,,100.00'
    );
    expectImportError(
      () => parseImportUpload(rows.join('\n')),
      'IMPORT_FILE_TOO_LARGE'
    );
  });
});

describe('parseImportUpload custom mapping', () => {
  it('maps a headed file with a named signed-amount column', () => {
    const parsed = requireParsed(
      parseImportUpload('posted,total,memo\n2026-05-02,42.00,Coffee', {
        kind: 'mapping',
        mapping: {
          dateColumn: 'posted',
          dateFormat: 'YYYY-MM-DD',
          descriptionColumn: 'memo',
          amount: {
            kind: 'signed',
            column: 'total',
            positiveIsExpense: true,
          },
        },
      })
    );

    expect(parsed.contentProfileId).toBeNull();
    expect(parsed.rowCount).toBe(1);
    expect(parsed.rows[0]).toMatchObject({
      parsedDate: '2026-05-02',
      parsedAmount: 4200,
      parsedType: 'expense',
      parsedDescription: 'Coffee',
    });
  });

  it('maps headerless rows without skipping the first record', () => {
    const parsed = requireParsed(
      parseImportUpload(
        [
          '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00',
          '05/08/2026,MERCHANT CREDIT,,5.00,105.00',
        ].join('\n'),
        {
          kind: 'mapping',
          mapping: {
            dateColumn: 'Column 1',
            dateFormat: 'MM/DD/YYYY',
            descriptionColumn: 'Column 2',
            amount: {
              kind: 'debit_credit',
              debitColumn: 'Column 3',
              creditColumn: 'Column 4',
            },
          },
        }
      )
    );

    expect(parsed.contentProfileId).toBeNull();
    expect(parsed.rowCount).toBe(2);
    expect(parsed.rows[0]).toMatchObject({
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
  });

  it('rejects a mapping that names a missing column', () => {
    expectImportError(
      () =>
        parseImportUpload('posted,total,memo\n2026-05-02,42,Coffee', {
          kind: 'mapping',
          mapping: {
            dateColumn: 'posted',
            dateFormat: 'YYYY-MM-DD',
            descriptionColumn: 'memo',
            amount: {
              kind: 'signed',
              column: 'amount',
              positiveIsExpense: true,
            },
          },
        }),
      'IMPORT_INVALID_SELECTION'
    );
  });
});
