import { z } from 'zod';
import {
  PERIOD_SHORTCUT_VALUES,
  resolvePeriodFromCalendarDates,
  resolvePeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodRange,
  PeriodShortcut,
} from '@ploutizo/utils/dashboard-period';

export type DashboardPeriodSearchInput = {
  range?: string;
  from?: string;
  to?: string;
};

export type ParsedDashboardPeriodSearch =
  | { ok: true; range: DashboardPeriodRange; shortcut?: PeriodShortcut }
  | { ok: false };

const customRangeSearchSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .strict();

const shortcutSearchSchema = z
  .object({
    range: z.enum(PERIOD_SHORTCUT_VALUES),
  })
  .strict();

/** Validates dashboard period search params for URL/localStorage restore (PLO-117). */
export const parseDashboardPeriodSearch = (
  input: DashboardPeriodSearchInput,
  today: Date = new Date()
): ParsedDashboardPeriodSearch => {
  const hasRange = input.range !== undefined;
  const hasFrom = input.from !== undefined;
  const hasTo = input.to !== undefined;

  if (hasRange && (hasFrom || hasTo)) {
    return { ok: false };
  }
  if (hasFrom !== hasTo) {
    return { ok: false };
  }

  if (hasRange) {
    const parsedShortcut = shortcutSearchSchema.safeParse({
      range: input.range,
    });
    if (!parsedShortcut.success) {
      return { ok: false };
    }
    return {
      ok: true,
      shortcut: parsedShortcut.data.range,
      range: resolvePeriodShortcut(parsedShortcut.data.range, today),
    };
  }

  if (hasFrom && hasTo) {
    const parsedCustom = customRangeSearchSchema.safeParse({
      from: input.from,
      to: input.to,
    });
    if (!parsedCustom.success) {
      return { ok: false };
    }
    const resolved = resolvePeriodFromCalendarDates(
      parsedCustom.data.from,
      parsedCustom.data.to
    );
    if (resolved === 'invalid') {
      return { ok: false };
    }
    return { ok: true, range: resolved };
  }

  return {
    ok: true,
    shortcut: 'mtd',
    range: resolvePeriodShortcut('mtd', today),
  };
};

export const serializeDashboardPeriodSearch = (
  input:
    | { kind: 'shortcut'; shortcut: PeriodShortcut }
    | { kind: 'custom'; from: string; to: string }
): Record<string, string> => {
  if (input.kind === 'shortcut') {
    return { range: input.shortcut };
  }
  return { from: input.from, to: input.to };
};
