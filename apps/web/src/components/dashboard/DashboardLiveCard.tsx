import { CircleQuestionMark } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Text } from '@ploutizo/ui/components/text';
import type { ReactNode } from 'react';

type DashboardLiveCardProps = {
  title: string;
  description?: string;
  /** Right-hand header content; render it as a `CardAction`. */
  action?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  /** Replaces the card body when `isError`. Recovery is the single header Refresh. */
  errorMessage: string;
  children: ReactNode;
};

/**
 * Card shell for the Dashboard sections that ignore any date range: title,
 * an all-time hint, optional description and action, and the error body.
 */
export const DashboardLiveCard = ({
  title,
  description,
  action,
  isLoading,
  isError,
  errorMessage,
  children,
}: DashboardLiveCardProps) => (
  <Card aria-busy={isLoading} className="w-full gap-0 py-0">
    <CardHeader className="gap-x-3 gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
      <CardTitle className="flex items-center gap-0.5 text-lg leading-tight">
        {title}
        {/* Popover, not Tooltip: tooltips never open on touch. */}
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
      </CardTitle>
      {description ? (
        <CardDescription className="text-xs leading-normal">
          {description}
        </CardDescription>
      ) : null}
      {action}
    </CardHeader>
    {isError ? (
      <CardContent className="px-3.5 py-6">
        <Text variant="caption" role="alert">
          {errorMessage}
        </Text>
      </CardContent>
    ) : (
      children
    )}
  </Card>
);
