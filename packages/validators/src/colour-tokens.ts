import { COLOUR_TOKENS } from '@ploutizo/types';
import { z } from 'zod';
import type { ColourToken } from '@ploutizo/types';

export const colourTokenSchema = z.enum(
  COLOUR_TOKENS as [ColourToken, ...ColourToken[]]
);
