import { getFinancialInstitutionName } from '@ploutizo/types';

export interface AccountLabelInput {
  name: string;
  institutionId?: string | null;
  lastFour: string | null;
}

export interface AccountInstitutionMetaInput {
  institutionId?: string | null;
  lastFour: string | null;
}

export const formatAccountInstitutionMeta = ({
  institutionId,
  lastFour,
}: AccountInstitutionMetaInput): string | null => {
  const institution = getFinancialInstitutionName(institutionId ?? null);
  const last = lastFour?.trim();
  const metaParts: string[] = [];
  if (institution) metaParts.push(institution);
  if (last) metaParts.push(`•••• ${last}`);
  return metaParts.length > 0 ? metaParts.join(' ') : null;
};

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
