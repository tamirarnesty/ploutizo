import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ploutizo/ui/components/sheet';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

type AppSheetProps = {
  title: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  trigger?: ReactElement<{ children?: ReactNode }>;
  children?: ReactNode;
} & Pick<ComponentProps<typeof Sheet>, 'open' | 'onOpenChange'> &
  Pick<ComponentProps<typeof SheetContent>, 'side'>;

/** Sheet that always exposes a required accessible name via SheetTitle. */
export const AppSheet = ({
  open,
  onOpenChange,
  title,
  description,
  descriptionClassName,
  headerClassName,
  contentClassName,
  side,
  trigger,
  children,
}: AppSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    {/* Base UI takes children from the Trigger, not the render element —
        pass the element's children through or they are dropped. */}
    {trigger ? (
      <SheetTrigger render={trigger}>{trigger.props.children}</SheetTrigger>
    ) : null}
    <SheetContent side={side} className={contentClassName}>
      <SheetHeader className={headerClassName}>
        <SheetTitle>{title}</SheetTitle>
        {description ? (
          <SheetDescription className={descriptionClassName}>
            {description}
          </SheetDescription>
        ) : null}
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
);
