import { CircleQuestionMark } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { CardDescription } from '@ploutizo/ui/components/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { ReactNode } from 'react';

type DashboardLiveCardProps = {
  title: string;
  description?: string;
  /** Right-hand header content; render it as a `CardAction`. */
  action?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  /** Replaces the card body when `isError`. */
  errorMessage: string;
  className?: string;
  children: ReactNode;
};

/** Dashboard card for the sections that ignore any date range: adds an all-time hint to the title. */
export const DashboardLiveCard = ({
  title,
  description,
  action,
  isLoading,
  isError,
  errorMessage,
  className,
  children,
}: DashboardLiveCardProps) => (
  <DashboardCard
    title={title}
    titleAddon={
      // Popover, not Tooltip: tooltips never open on touch.
      <Popover>
        <PopoverTrigger
          openOnHover
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`About ${title}`}
              className="text-muted-foreground"
            />
          }
        >
          <CircleQuestionMark />
        </PopoverTrigger>
        <PopoverContent side="top" className="w-auto px-2 py-1 text-xs">
          All time
        </PopoverContent>
      </Popover>
    }
    header={
      <>
        {description ? (
          <CardDescription className="text-xs leading-normal">
            {description}
          </CardDescription>
        ) : null}
        {action}
      </>
    }
    isBusy={isLoading}
    error={isError ? errorMessage : undefined}
    className={className}
  >
    {children}
  </DashboardCard>
);
