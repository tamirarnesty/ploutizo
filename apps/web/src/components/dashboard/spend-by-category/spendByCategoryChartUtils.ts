import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import { colourTokenVar } from '@/components/colour/colour-token-style';
import { fadedColour } from '@/components/dashboard/dashboardChartColour';
import { formatPreciseCurrency } from '@/components/dashboard/dashboardFormat';
import type { TooltipPayloadEntry } from 'recharts';

const shareFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatCategoryShare = (shareOfPeriod: number): string =>
  shareFormatter.format(shareOfPeriod);

export const formatCategoryChangeVsPrior = (
  amountCents: number,
  priorAmountCents: number | null
): string | null => {
  if (priorAmountCents === null) {
    return null;
  }
  const delta = amountCents - priorAmountCents;
  if (delta === 0) {
    return 'No change vs prior';
  }
  const formatted = formatPreciseCurrency(Math.abs(delta));
  return delta > 0 ? `+${formatted} vs prior` : `−${formatted} vs prior`;
};

/** A row's paint for each period's bar. */
type SeriesPaint = { current: string; prior: string };

/** One bar group: this period's amount and, when the overview has a prior window, the prior period's. */
export type SpendByCategoryChartRow = {
  /** Stable axis key: the category id, or the synthetic row's kind. */
  key: string;
  label: string;
  /** SVG fills for the row's bars; prior is the current colour, faded. */
  fill: SeriesPaint;
  /** CSS colours for the row's tooltip dots, matching `fill` (a pattern fill has no CSS equivalent). */
  indicator: SeriesPaint;
  current: number;
  prior: number | null;
  /** Null when the row nets to zero or less, as when refunds exceed spend. */
  shareOfPeriod: number | null;
};

/**
 * The aggregate row is a solid neutral from the theme, never a palette colour a category could also use.
 * Uncategorised is the same neutral, hatched, so the two synthetic rows read as neutral yet stay distinct.
 */
export const NEUTRAL_SERIES_COLOUR = 'var(--muted-foreground)';

const solidPaint = (colour: string): SeriesPaint => ({
  current: colour,
  prior: fadedColour(colour),
});

const displayFor = (
  row: DashboardOverviewCategoryRow,
  uncategorisedFill: SeriesPaint
): Pick<SpendByCategoryChartRow, 'key' | 'label' | 'fill' | 'indicator'> => {
  switch (row.kind) {
    case 'category': {
      const paint = solidPaint(colourTokenVar(row.colour));
      return {
        key: row.categoryId,
        label: row.name,
        fill: paint,
        indicator: paint,
      };
    }
    case 'other': {
      const paint = solidPaint(NEUTRAL_SERIES_COLOUR);
      return {
        key: 'other',
        label: 'All other categories',
        fill: paint,
        indicator: paint,
      };
    }
    case 'uncategorised':
      return {
        key: 'uncategorised',
        label: 'Uncategorised',
        fill: uncategorisedFill,
        indicator: solidPaint(NEUTRAL_SERIES_COLOUR),
      };
  }
};

/**
 * `uncategorisedFill` is the chart's hatch patterns, e.g. `url(#id)`, whose ids only the chart knows: one for
 * this period and a faded one for the prior period.
 */
export const toSpendByCategoryChartRows = (
  rows: DashboardOverviewCategoryRow[],
  uncategorisedFill: SeriesPaint
): SpendByCategoryChartRow[] =>
  rows.map((row) => ({
    ...displayFor(row, uncategorisedFill),
    current: row.amountCents,
    prior: row.priorAmountCents,
    shareOfPeriod: row.shareOfPeriod,
  }));

/** The tooltip subtitle: the row's share of spend when it has one and, when there is a prior window, its change. */
export const formatCategorySummary = (row: SpendByCategoryChartRow): string =>
  [
    row.shareOfPeriod === null
      ? null
      : `${formatCategoryShare(row.shareOfPeriod)} of spend`,
    formatCategoryChangeVsPrior(row.current, row.prior),
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The tooltip dot for one bar: its row's colour for that period. Recharts gives the tooltip each <Bar>'s own
 * fill, never its <Cell> fills, so the chart resolves the row's colour here.
 */
export const spendByCategoryIndicatorColor = (
  item: TooltipPayloadEntry
): string | undefined => {
  const row = item.payload as SpendByCategoryChartRow | undefined;
  if (!row) {
    return undefined;
  }
  if (item.dataKey === 'current') {
    return row.indicator.current;
  }
  if (item.dataKey === 'prior') {
    return row.indicator.prior;
  }
  return undefined;
};
