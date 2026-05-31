import { z } from 'zod';

export const COLOUR_SWATCHES = [
  { name: 'Slate', value: 'slate-500' },
  { name: 'Red', value: 'red-500' },
  { name: 'Orange', value: 'orange-500' },
  { name: 'Amber', value: 'amber-500' },
  { name: 'Yellow', value: 'yellow-500' },
  { name: 'Lime', value: 'lime-500' },
  { name: 'Green', value: 'green-500' },
  { name: 'Teal', value: 'teal-500' },
  { name: 'Cyan', value: 'cyan-500' },
  { name: 'Blue', value: 'blue-500' },
  { name: 'Violet', value: 'violet-500' },
  { name: 'Pink', value: 'pink-500' },
] as const;

export const COLOUR_TOKENS = COLOUR_SWATCHES.map((s) => s.value);

export type ColourToken = (typeof COLOUR_SWATCHES)[number]['value'];

export const colourTokenSchema = z.enum(
  COLOUR_TOKENS as [ColourToken, ...ColourToken[]]
);

export const parseColourToken = (
  raw: string | null | undefined
): ColourToken | null => {
  if (raw == null || raw === '') return null;
  const result = colourTokenSchema.safeParse(raw);
  return result.success ? result.data : null;
};
