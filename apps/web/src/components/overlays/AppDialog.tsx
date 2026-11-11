import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import type { ComponentProps, ReactNode } from 'react';

type AppDialogProps = {
  title: ReactNode;
  /** When set (for example `sr-only`), the required title stays in the accessibility tree only. */
  titleClassName?: string;
  description?: ReactNode;
  children?: ReactNode;
  contentClassName?: string;
} & Pick<ComponentProps<typeof Dialog>, 'open' | 'onOpenChange'> &
  Pick<ComponentProps<typeof DialogContent>, 'showCloseButton'>;

/** Dialog that always exposes a required accessible name via DialogTitle. */
export const AppDialog = ({
  open,
  onOpenChange,
  title,
  titleClassName,
  description,
  children,
  contentClassName,
  showCloseButton,
}: AppDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={contentClassName}
      showCloseButton={showCloseButton}
    >
      <DialogHeader>
        <DialogTitle className={titleClassName}>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);
