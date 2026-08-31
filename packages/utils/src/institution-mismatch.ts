import {
  getFinancialInstitutionName,
  isFinancialInstitutionId,
} from '@ploutizo/types';
import type { InstitutionMismatchWarning } from '@ploutizo/types';

export const getInstitutionMismatchWarning = (input: {
  detectedInstitutionId: string | null | undefined;
  accountInstitutionId: string | null | undefined;
}): InstitutionMismatchWarning | null => {
  const { detectedInstitutionId, accountInstitutionId } = input;
  if (
    !isFinancialInstitutionId(detectedInstitutionId) ||
    !isFinancialInstitutionId(accountInstitutionId)
  ) {
    return null;
  }
  if (detectedInstitutionId === accountInstitutionId) return null;
  return { detectedInstitutionId, accountInstitutionId };
};

export const formatInstitutionMismatchWarning = (
  warning: InstitutionMismatchWarning
): string => {
  const detected = getFinancialInstitutionName(warning.detectedInstitutionId);
  const selected = getFinancialInstitutionName(warning.accountInstitutionId);
  return `This file looks like ${detected}, but the selected card is ${selected}. You can continue if that is intentional.`;
};
