export interface AccountLabelInput {
  name: string;
  institution: string | null;
  lastFour: string | null;
}

export const formatAccountLabel = ({
  name,
  institution,
  lastFour,
}: AccountLabelInput): string =>
  [name, institution, lastFour ? `••${lastFour}` : null]
    .filter(Boolean)
    .join(' · ');
