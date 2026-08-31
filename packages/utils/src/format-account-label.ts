import { getFinancialInstitutionName } from '@ploutizo/types';

export interface AccountLabelInput {
  name: string;
  institutionId?: string | null;
  lastFour: string | null;
}

export const formatAccountLabel = ({
  name,
  institutionId,
  lastFour,
}: AccountLabelInput): string =>
  [
    name.trim() || 'Unnamed Account',
    getFinancialInstitutionName(institutionId ?? null),
    lastFour ? `••${lastFour}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
