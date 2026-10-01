import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ReactNode } from 'react';

type DashboardCardProps = {
  title: string;
  /** Inline after the title, e.g. a hint popover. */
  titleAddon?: ReactNode;
  /** Header content after the title: `CardDescription`, `CardAction`. */
  header?: ReactNode;
  isBusy: boolean;
  /** When set, replaces the body with an alert. Recovery is the single header Refresh. */
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Frame shared by every Dashboard card: title row, header content, and the error body. */
export const DashboardCard = ({
  title,
  titleAddon,
  header,
  isBusy,
  error,
  className,
  children,
}: DashboardCardProps) => (
  <Card aria-busy={isBusy} className={cn('w-full gap-0 py-0', className)}>
    <CardHeader className="gap-x-3 gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
      <CardTitle className="flex items-center gap-0.5 text-lg leading-tight">
        {title}
        {titleAddon}
      </CardTitle>
      {header}
    </CardHeader>
    {error === undefined ? (
      children
    ) : (
      <CardContent className="px-3.5 py-6">
        <Text variant="caption" role="alert">
          {error}
        </Text>
      </CardContent>
    )}
  </Card>
);
