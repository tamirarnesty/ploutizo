import { internalImportNormalizer } from './internal';
import type { CsvUpload, ImportNormalizer } from '../types';
import { DomainError } from '@/lib/errors';

const bankNormalizers: ImportNormalizer[] = [];

export const detectImportNormalizer = (upload: CsvUpload): ImportNormalizer => {
  const bankMatches = bankNormalizers.filter((normalizer) =>
    normalizer.matches(upload)
  );

  if (bankMatches.length > 1) {
    throw new DomainError(
      400,
      'This file matches more than one supported bank format.',
      'IMPORT_FILE_AMBIGUOUS'
    );
  }

  if (bankMatches.length === 1) {
    return bankMatches[0];
  }

  if (internalImportNormalizer.matches(upload)) {
    return internalImportNormalizer;
  }

  throw new DomainError(
    400,
    'This file is not a recognized import format.',
    'IMPORT_FILE_UNRECOGNIZED'
  );
};
