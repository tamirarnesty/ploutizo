import { RefreshCw } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';

type DashboardHeaderProps = {
  onRetry: () => void;
  isRefreshing: boolean;
};

/** One Refresh for the whole page — individual cards never own a refresh control. */
export const DashboardHeader = ({
  onRetry,
  isRefreshing,
}: DashboardHeaderProps) => (
  <div className="flex items-center justify-between gap-3">
    <Text as="h1" variant="h3" className="min-w-0 truncate">
      Dashboard
    </Text>
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            className="shrink-0"
            disabled={isRefreshing}
            onClick={onRetry}
          />
        }
      >
        <RefreshCw className={cn(isRefreshing && 'motion-safe:animate-spin')} />
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
  </div>
);
