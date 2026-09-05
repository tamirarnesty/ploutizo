import { addDays, format, parseISO } from 'date-fns';
import { resolveImportRowReviewDate } from '../import-row-status';
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
    const date = resolveImportRowReviewDate(row);
    if (date) dates.push(date);
    const externalId = row.externalId?.trim();
    if (externalId) externalIds.push(externalId);
  }

  if (dates.length === 0) {
    return {
      minDate: null,
      maxDate: null,
      externalIds: [...new Set(externalIds)],
    };
  }

  const sortedDates = [...dates].sort();
  const earliest = sortedDates.reduce((min, date) => (date < min ? date : min));
  const latest = sortedDates.reduce((max, date) => (date > max ? date : max));

  return {
    minDate: format(
      addDays(parseISO(earliest), -IMPORT_MATCH_DATE_TOLERANCE_DAYS),
      'yyyy-MM-dd'
    ),
    maxDate: format(
      addDays(parseISO(latest), IMPORT_MATCH_DATE_TOLERANCE_DAYS),
      'yyyy-MM-dd'
    ),
    externalIds: [...new Set(externalIds)],
  };
};
