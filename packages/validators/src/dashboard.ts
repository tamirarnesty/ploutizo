import { z } from 'zod';
import {
  DASHBOARD_PERIOD_SHORTCUTS,
  DASHBOARD_RANGED_SHORTCUTS,
} from '@ploutizo/utils/dashboard-period';
import { DASHBOARD_OVERVIEW_GRAIN_VALUES } from '@ploutizo/types';
import { colourTokenSchema } from './colour-tokens';

const calendarDates = {
  from: z.iso.date(),
  to: z.iso.date(),
};

const isOrderedRange = (value: { from: string; to: string }) =>
  value.from <= value.to;

const orderedRangeError = {
  message: 'from must be on or before to',
  path: ['from'],
};

// Not strict: the router re-validates its own output, which carries the unused keys as undefined.
const absent = z.never().optional();

/** Dashboard URL search: a shortcut name or a custom from–to, never both. */
export const dashboardPeriodSearchSchema = z.union([
  z.object({
    range: z.enum(DASHBOARD_PERIOD_SHORTCUTS),
    from: absent,
    to: absent,
  }),
  z
    .object({ range: absent, ...calendarDates })
    .refine(isOrderedRange, orderedRangeError),
]);

/**
 * No params means All. Otherwise the range to chart, and the shortcut it came from, which picks the prior
 * window; a range without one is custom. The API derives the prior window and grain.
 */
export const dashboardOverviewQuerySchema = z.union([
  z
    .object({})
    .strict()
    .transform(() => ({ kind: 'all' as const })),
  z
    .object({
      ...calendarDates,
      shortcut: z.enum(DASHBOARD_RANGED_SHORTCUTS).optional(),
    })
    .strict()
    .refine(isOrderedRange, orderedRangeError)
    .transform(({ shortcut, ...range }) => ({
      kind: 'ranged' as const,
      shortcut: shortcut ?? null,
      ...range,
    })),
]);

export type DashboardOverviewQuery = z.output<
  typeof dashboardOverviewQuerySchema
>;

/**
 * The `GET /api/dashboard/overview` response. The API tests and the web client parse against it, so a
 * drifting server or client fails loudly instead of rendering wrong data.
 */
const dashboardOverviewGrainSchema = z.enum(DASHBOARD_OVERVIEW_GRAIN_VALUES);

const dashboardOverviewRangeSchema = z.object({
  ...calendarDates,
  priorFrom: z.iso.date().nullable(),
  priorTo: z.iso.date().nullable(),
  grain: dashboardOverviewGrainSchema,
});

/** Net spend and share shared by every category row; `priorAmountCents` is null on All, which has no prior. */
const categoryRowAmounts = {
  amountCents: z.number().int(),
  /** This row's share of total positive net spend in the period, uncategorised included (0–1). */
  shareOfPeriod: z.number().min(0).max(1),
  priorAmountCents: z.number().int().nullable(),
};

/**
 * One bar in "Spend by category": a top category, the aggregate of the categories beyond the top eight, or
 * spend with no category. The web owns the labels and colours of the two synthetic kinds.
 */
const dashboardOverviewCategoryRowSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('category'),
    categoryId: z.string(),
    name: z.string(),
    colour: colourTokenSchema,
    ...categoryRowAmounts,
  }),
  z.object({
    kind: z.literal('other'),
    /** How many categories the aggregate covers. */
    categoryCount: z.number().int().positive(),
    ...categoryRowAmounts,
  }),
  z.object({
    kind: z.literal('uncategorised'),
    ...categoryRowAmounts,
  }),
]);

export const dashboardOverviewResponseSchema = z.object({
  meta: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('ranged'),
      range: dashboardOverviewRangeSchema,
    }),
    z.object({
      kind: z.literal('all'),
      /** First to last day with spend, monthly with no prior; null when there is none. */
      range: dashboardOverviewRangeSchema.nullable(),
    }),
  ]),
  trend: z.array(
    z.object({
      bucketStart: z.iso.date(),
      amountCents: z.number().int(),
      priorAmountCents: z.number().int().nullable(),
    })
  ),
  categories: z.array(dashboardOverviewCategoryRowSchema),
});

export type GetDashboardOverviewResponse = z.infer<
  typeof dashboardOverviewResponseSchema
>;
export type DashboardOverviewMeta = GetDashboardOverviewResponse['meta'];
export type DashboardOverviewTrendPoint =
  GetDashboardOverviewResponse['trend'][number];
export type DashboardOverviewCategoryRow =
  GetDashboardOverviewResponse['categories'][number];
