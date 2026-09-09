import { addDays, format, parseISO } from 'date-fns';
import { resolveReviewedImportValues } from '../reviewed-import-values';
import { IMPORT_MATCH_DATE_TOLERANCE_DAYS } from './types';

export const collectMatchedTransactionIds = (
  rows: readonly { reviewMatchedTransactionId: string | null }[]
): string[] =>
  rows.flatMap((row) =>
    row.reviewMatchedTransactionId ? [row.reviewMatchedTransactionId] : []
  );

export interface ImportMatchTargetQueryBounds {
  minDate: string | null;
  maxDate: string | null;
  externalIds: string[];
}

export interface ImportMatchTargetQueryInput extends ImportMatchTargetQueryBounds {
  extraIds: string[];
}

/** Date and external-ID bounds for loading match candidates on the destination card. */
export const importMatchTargetQueryBounds = (
  rows: readonly {
    reviewDate: string | null;
    parsedDate: string | null;
    externalId?: string | null;
  }[]
): ImportMatchTargetQueryBounds => {
  const dates: string[] = [];
  const externalIds: string[] = [];

  for (const row of rows) {
    const date = resolveReviewedImportValues(row).date;
    if (date) dates.push(date);
    const externalId = row.externalId?.trim();
    if (externalId) externalIds.push(externalId);
  }

  const uniqueExternalIds = [...new Set(externalIds)];
  if (dates.length === 0) {
    return {
      minDate: null,
      maxDate: null,
      externalIds: uniqueExternalIds,
    };
  }

  const earliest = dates.reduce((min, date) => (date < min ? date : min));
  const latest = dates.reduce((max, date) => (date > max ? date : max));

  return {
    minDate: format(
      addDays(parseISO(earliest), -IMPORT_MATCH_DATE_TOLERANCE_DAYS),
      'yyyy-MM-dd'
    ),
    maxDate: format(
      addDays(parseISO(latest), IMPORT_MATCH_DATE_TOLERANCE_DAYS),
      'yyyy-MM-dd'
    ),
    externalIds: uniqueExternalIds,
  };
};

export const importMatchTargetQueryInput = (
  rows: readonly {
    reviewDate: string | null;
    parsedDate: string | null;
    externalId?: string | null;
    reviewMatchedTransactionId: string | null;
  }[]
): ImportMatchTargetQueryInput => ({
  extraIds: collectMatchedTransactionIds(rows),
  ...importMatchTargetQueryBounds(rows),
});
