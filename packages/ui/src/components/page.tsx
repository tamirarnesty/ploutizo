import * as React from 'react';

import { cn } from '@/lib/utils';
import { Text, type TextAs } from '@/components/text';

type PageHeaderProps = {
  /** Page title. Rendered as an `<h1>` with the `h3` text variant by default. */
  title: React.ReactNode;
  /** Heading element for the title when `h1` is not appropriate (e.g. nested under another page heading). */
  titleAs?: TextAs;
  /** Ancestor trail rendered above the title row (e.g. `Parent / Child`). */
  breadcrumb?: React.ReactNode;
  /** Muted supporting line under the title (e.g. counts, context). */
  description?: React.ReactNode;
  /** Right-aligned controls. The row layout is identical with or without them. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Standard page container inside the authenticated layout's `<main>`.
 * One vertical rhythm (`gap-6`) for every page.
 */
export const Page = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => (
  <div className={cn('flex flex-col gap-6', className)} {...props} />
);

/**
 * Consistent page header: optional breadcrumb, then title on the left and
 * optional actions on the right. Always renders the same flex row so pages
 * with and without actions align.
 */
export const PageHeader = ({
  title,
  titleAs = 'h1',
  breadcrumb,
  description,
  actions,
  className,
}: PageHeaderProps) => (
  <header className={cn('flex flex-col gap-1', className)}>
    {breadcrumb}
    {/* min-h-8 matches the default button height so action-less headers keep the same row height. */}
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Text
          as={titleAs}
          variant="h3"
          className="min-w-0 text-balance wrap-break-word"
        >
          {title}
        </Text>
        {description ? (
          <Text
            as="div"
            variant="body-sm"
            className="text-pretty wrap-break-word text-muted-foreground"
          >
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? (
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  </header>
);
