import { describe, expect, it } from 'vitest';
import { MAX_NORMALIZED_IMPORT_BYTES } from '@ploutizo/types';
import { parsePloutizoNormalizedCsv } from './normalizedCsv';
import { DomainError } from '@/lib/errors';

const expectImportError = (fn: () => unknown, code: string) => {
  try {
    fn();
    throw new Error('Expected parser to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
};

describe('parsePloutizoNormalizedCsv', () => {
  it('keeps invalid rows with reasons when at least one row is reviewable', () => {
    const parsed = parsePloutizoNormalizedCsv(
      [
        'date,amount,description,type,external id,category,notes,tags',
        '2026-05-02,42.18,Neighborhood Grocery,expense,visa-1001,Groceries,Weekly shop,food; errands',
        'not-a-date,nope,,charge,visa-1002,,,',
      ].join('\n')
    );

    expect(parsed.rowCount).toBe(2);
    expect(parsed.validRowCount).toBe(1);
    expect(parsed.invalidRowCount).toBe(1);
    expect(parsed.rows[0]).toMatchObject({
      status: 'needs_review',
      parsedAmount: 4218,
      reviewCategoryName: 'Groceries',
      reviewAssigneeMemberIds: [],
      reviewTags: ['food', 'errands'],
      rawData: {
        date: '2026-05-02',
        amount: '42.18',
        description: 'Neighborhood Grocery',
      },
    });
    expect(parsed.rows[1].status).toBe('invalid');
    expect(parsed.rows[1].invalidReason).toContain('Date must be');
    expect(parsed.rows[1].invalidReason).toContain('Amount must be');
    expect(parsed.rows[1].invalidReason).toContain('Description is required');
    expect(parsed.rows[1].invalidReason).toContain('Type must be');
  });

  it('marks rows needing classification as needs_review', () => {
    const parsed = parsePloutizoNormalizedCsv(
      ['date,amount,description,type', '2026-05-02,42.18,Coffee,expense'].join(
        '\n'
      )
    );

    expect(parsed.rows[0]).toMatchObject({
      status: 'needs_review',
      reviewDescription: 'Coffee',
      reviewCategoryName: null,
    });
  });

  it('rejects unrecognized files with missing required headers', () => {
    expectImportError(
      () =>
        parsePloutizoNormalizedCsv('posted,total,memo\n2026-05-02,42,Coffee'),
      'IMPORT_FILE_UNRECOGNIZED'
    );
  });

  it('rejects corrupt CSV with an unclosed quoted field', () => {
    expectImportError(
      () =>
        parsePloutizoNormalizedCsv(
          'date,amount,description,type\n2026-05-02,42.18,"Coffee,expense'
        ),
      'IMPORT_FILE_CORRUPT'
    );
  });

  it('rejects corrupt CSV with trailing characters after a quoted field', () => {
    expectImportError(
      () =>
        parsePloutizoNormalizedCsv(
          'date,amount,description,type\n2026-05-02,42.18,"Coffee"x,expense'
        ),
      'IMPORT_FILE_CORRUPT'
    );
  });

  it('rejects malformed grouped amount tokens', () => {
    const parsed = parsePloutizoNormalizedCsv(
      [
        'date,amount,description,type',
        '2026-05-02,42.18,Coffee,expense',
        '2026-05-03,"12,34.56",Tea,expense',
      ].join('\n')
    );

    expect(parsed.rows[1].status).toBe('invalid');
    expect(parsed.rows[1].invalidReason).toContain('Amount must be');
  });

  it('rejects amounts with misplaced dollar signs', () => {
    const parsed = parsePloutizoNormalizedCsv(
      [
        'date,amount,description,type',
        '2026-05-02,$42.18,Coffee,expense',
        '2026-05-03,12$34.56,Tea,expense',
        '2026-05-04,$$42.00,Water,expense',
      ].join('\n')
    );

    expect(parsed.rows[0].parsedAmount).toBe(4218);
    expect(parsed.rows[1].status).toBe('invalid');
    expect(parsed.rows[1].invalidReason).toContain('Amount must be');
    expect(parsed.rows[2].status).toBe('invalid');
    expect(parsed.rows[2].invalidReason).toContain('Amount must be');
  });

  it('rejects empty files and files with no importable rows', () => {
    expectImportError(
      () => parsePloutizoNormalizedCsv('  \n\n'),
      'IMPORT_FILE_EMPTY'
    );
    expectImportError(
      () =>
        parsePloutizoNormalizedCsv(
          'date,amount,description,type\nnot-a-date,nope,,wat'
        ),
      'IMPORT_FILE_EMPTY'
    );
  });

  it('rejects files over the normalized import size limit', () => {
    expectImportError(
      () =>
        parsePloutizoNormalizedCsv('a'.repeat(MAX_NORMALIZED_IMPORT_BYTES + 1)),
      'IMPORT_FILE_TOO_LARGE'
    );
  });
});
