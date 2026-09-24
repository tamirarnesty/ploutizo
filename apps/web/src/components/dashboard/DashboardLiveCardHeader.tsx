import { CircleQuestionMark } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { CardHeader, CardTitle } from '@ploutizo/ui/components/card';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';

const ALL_TIME_HINT = 'All time';

type DashboardLiveCardHeaderProps = {
  title: string;
  description?: string;
  /** Signed section total. Omit to hide the total (empty or failed sections). */
  totalCents?: number;
  isLoading?: boolean;
};

/**
 * Shared header for the Dashboard sections that ignore any date range: title,
 * an all-time hint, and the section total.
 */
export const DashboardLiveCardHeader = ({
  title,
  description,
  totalCents,
  isLoading = false,
}: DashboardLiveCardHeaderProps) => (
  <CardHeader className="gap-0 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
    <div className="flex w-full min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-0.5">
          <CardTitle className="truncate text-lg leading-tight">
            {title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`About ${title}`}
                  className="shrink-0 text-muted-foreground"
                />
              }
            >
              <CircleQuestionMark />
            </TooltipTrigger>
            <TooltipContent>{ALL_TIME_HINT}</TooltipContent>
          </Tooltip>
        </div>
        {description ? <Text variant="caption">{description}</Text> : null}
      </div>
      {isLoading || totalCents !== undefined ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Text variant="caption">Total</Text>
          {isLoading ? (
            <Skeleton
              className="h-4 w-20 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <SignedBalanceText
              as="p"
              cents={totalCents ?? 0}
              className="text-right text-base leading-none font-bold"
            />
          )}
        </div>
      ) : null}
    </div>
  </CardHeader>
);
