import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'TransactionForm.tsx'),
  'utf8'
);

describe('TransactionForm description policy wiring', () => {
  it('uses resolveTransactionDescriptionPolicy instead of ad-hoc type switches', () => {
    expect(source).toContain('resolveTransactionDescriptionPolicy');
    expect(source).toContain('resolveTransactionDescriptionLock');
    expect(source).not.toMatch(
      /type === ['"]transfer['"][\s\S]{0,120}type === ['"]settlement['"]/
    );
  });
});
