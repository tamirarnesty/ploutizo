import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { describe, expect, it } from 'vitest';
import { matchesBillPaymentPhrase } from '@ploutizo/types';

const profilesDir = dirname(fileURLToPath(import.meta.url));

const readFixture = (...relativePath: string[]) =>
  readFileSync(join(profilesDir, ...relativePath), 'utf8');

const parseCsv = (content: string): string[][] =>
  parse(content, { relax_column_count: true, skip_empty_lines: true });

const AMEX_SHORT_HEADERS = [
  'Date',
  'Date Processed',
  'Description',
  'Card Member',
  'Account #',
  'Amount',
] as const;

const AMEX_EXTENDED_HEADERS = [
  ...AMEX_SHORT_HEADERS,
  'Foreign Spend Amount',
  'Commission',
  'Exchange Rate',
  'Merchant',
  'Merchant Address',
  'Merchant City/State',
  'Zip Code',
  'Country',
  'Reference',
  'Category',
] as const;

const PC_HEADERS = [
  'Description',
  'Type',
  'Card Holder Name',
  'Date',
  'Time',
  'Amount',
] as const;

describe('content profile contract fixtures', () => {
  it('covers Amex short accepted shapes and an unmatched Card Member hint', () => {
    const rows = parseCsv(readFixture('amex', 'short.csv'));
    const [headers, ...data] = rows;

    expect(headers).toEqual([...AMEX_SHORT_HEADERS]);
    expect(rows.every((row) => row.length === AMEX_SHORT_HEADERS.length)).toBe(
      true
    );
    expect(data.map((row) => row[2])).toEqual([
      'NEIGHBORHOOD GROCERY',
      'RETURNED CHARGER',
      'PAYMENT RECEIVED - THANK YOU',
      'BROKEN DATE ROW',
    ]);
    expect(data[0]?.[3]).toBe('Pat Nomatch');
    expect(data[0]?.[5]).toBe('12.34');
    expect(data[1]?.[5]).toBe('-5.00');
    expect(data[2]?.[5]).toBe('-50.00');
    expect(matchesBillPaymentPhrase(data[2]?.[2] ?? '')).toBe(true);
    expect(data[3]?.[0]).toBe('32 Foo 2026');
  });

  it('covers Amex extended optional Reference provenance', () => {
    const rows = parseCsv(readFixture('amex', 'extended.csv'));
    const [headers, ...data] = rows;

    expect(headers).toEqual([...AMEX_EXTENDED_HEADERS]);
    expect(
      rows.every((row) => row.length === AMEX_EXTENDED_HEADERS.length)
    ).toBe(true);
    expect(data[0]?.[14]).toBe("'AMEX-REF-0001");
    expect(data[1]?.[2]).toBe('MERCHANT CREDIT');
    expect(data[1]?.[5]).toBe('-5.00');
    expect(matchesBillPaymentPhrase(data[2]?.[2] ?? '')).toBe(true);
    expect(data[3]?.[5]).toBe('');
  });

  it('covers PC Financial types including a non-vault PAYMENT', () => {
    const rows = parseCsv(readFixture('pc-financial', 'statement.csv'));
    const [headers, ...data] = rows;

    expect(headers).toEqual([...PC_HEADERS]);
    expect(data.map((row) => row[1])).toEqual([
      'PURCHASE',
      'INTEREST',
      'PAYMENT',
      'FEE',
      'PURCHASE',
    ]);
    expect(data[0]?.[5]).toBe('-12.34');
    expect(data[1]?.[5]).toBe('-1.25');
    expect(data[2]?.[0]).toBe('PC FINANCIAL PAYMENT THANK YOU');
    expect(data[2]?.[5]).toBe('50.00');
    expect(matchesBillPaymentPhrase(data[2]?.[0] ?? '')).toBe(false);
    expect(data[3]?.[1]).toBe('FEE');
    expect(data[4]?.[3]).toBe('13/40/2026');
  });

  it('covers mdy_debit_credit_balance fixture: debit, credit, and phrase-vault Bill payment rows', () => {
    const rows = parseCsv(readFixture('td', 'statement.csv'));

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.length === 5)).toBe(true);
    expect(rows[0]).toEqual([
      '05/02/2026',
      'NEIGHBORHOOD GROCERY',
      '12.34',
      '',
      '100.00',
    ]);
    expect(rows[1]).toEqual([
      '05/08/2026',
      'MERCHANT CREDIT',
      '',
      '5.00',
      '105.00',
    ]);
    expect(rows[2]?.[1]).toBe('PAYMENT - THANK YOU');
    expect(matchesBillPaymentPhrase(rows[2]?.[1] ?? '')).toBe(true);
    expect(rows[3]?.[2]).toBe('12.34');
    expect(rows[3]?.[3]).toBe('5.00');
  });

  it('covers iso_debit_credit_masked_card fixture: debit, credit, and phrase-vault Bill payment rows', () => {
    const rows = parseCsv(readFixture('cibc', 'statement.csv'));

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.length === 5)).toBe(true);
    expect(rows[0]).toEqual([
      '2026-05-02',
      'NEIGHBORHOOD GROCERY',
      '12.34',
      '',
      '4505********1234',
    ]);
    expect(rows[1]?.[3]).toBe('5.00');
    expect(rows[2]?.[1]).toBe('PAIEMENT MERCI');
    expect(matchesBillPaymentPhrase(rows[2]?.[1] ?? '')).toBe(true);
    expect(rows[3]?.[2]).toBe('12.34');
    expect(rows[3]?.[3]).toBe('5.00');
  });

  it('documents shared Import file failure cases without guessing an issuer', () => {
    const mixed = parseCsv(readFixture('shared', 'headerless-mixed-dates.csv'));
    const unrecognized = parseCsv(
      readFixture('shared', 'headerless-unrecognized.csv')
    );
    const notes = readFixture('shared', 'invalid-and-file-failure-cases.md');

    expect(mixed).toHaveLength(2);
    expect(mixed[0]?.[0]).toBe('05/02/2026');
    expect(mixed[1]?.[0]).toBe('2026-05-03');
    expect(unrecognized[0]?.length).toBe(3);
    expect(notes).toContain('mapping_required');
    expect(notes).toContain('candidateProfileIds');
    expect(notes).toContain('IMPORT_INVALID_SELECTION');
    expect(notes).not.toContain('IMPORT_FILE_AMBIGUOUS');
  });
});
