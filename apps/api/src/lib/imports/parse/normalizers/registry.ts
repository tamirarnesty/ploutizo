import { isBlankRecord } from '../read';
import { internalImportNormalizer } from './internal';
import type { CsvUpload, ImportNormalizer } from '../types';
import { DomainError } from '@/lib/errors';

const bankNormalizers: ImportNormalizer[] = [];

const assertUploadHasContent = (upload: CsvUpload) => {
  const hasContent = upload.records.some((record) => !isBlankRecord(record));
  if (!hasContent) {
    throw new DomainError(400, 'The CSV file is empty.', 'IMPORT_FILE_EMPTY');
  }
};

export const detectImportNormalizer = (upload: CsvUpload): ImportNormalizer => {
  assertUploadHasContent(upload);

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
    'This file is not a Ploutizo normalized CSV. Required columns are date, amount, description, and type.',
    'IMPORT_FILE_UNRECOGNIZED'
  );
};
