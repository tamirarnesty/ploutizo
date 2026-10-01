import { cn } from '@ploutizo/ui/lib/utils';
import type { ColourToken } from '@ploutizo/types';
import { colourTokenVar } from './colour-token-style';

interface ColourTokenDotProps {
  token: ColourToken;
  className?: string;
}

export const ColourTokenDot = ({ token, className }: ColourTokenDotProps) => (
  <span
    aria-hidden
    className={cn('size-3 shrink-0 rounded-full', className)}
    style={{ backgroundColor: colourTokenVar(token) }}
  />
);
