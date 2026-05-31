import { parseColourToken } from '@ploutizo/validators';
import { COLOUR_SWATCH_BG } from './colour-token-classes';

interface ColourTokenDotProps {
  token: string | null;
}

export const ColourTokenDot = ({ token }: ColourTokenDotProps) => {
  const parsed = parseColourToken(token);
  if (!parsed) return null;

  return (
    <div
      className={`size-3 shrink-0 rounded-full ${COLOUR_SWATCH_BG[parsed]}`}
    />
  );
};
