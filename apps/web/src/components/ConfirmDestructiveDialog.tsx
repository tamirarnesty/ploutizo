import { cloneElement, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ReactElement, ReactNode } from 'react';

interface ConfirmDestructiveDialogProps {
  /** Controlled open state. When omitted, the dialog manages its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  /**
   * What opens the dialog: a custom element (rendered through
   * `AlertDialogTrigger`), or `'icon'` for the built-in trash-icon button
   * used by row actions. Omit for a controlled-only dialog.
   */
  trigger?: ReactElement | 'icon';
  /** Required when `trigger="icon"`. */
  triggerAriaLabel?: string;
  triggerClassName?: string;
  triggerTooltip?: string;
}

const ICON_TRIGGER_CLASS =
  'inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export const ConfirmDestructiveDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
  trigger,
  triggerAriaLabel,
  triggerClassName,
  triggerTooltip,
}: ConfirmDestructiveDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  let triggerNode: ReactNode = null;
  if (trigger === 'icon') {
    const iconTrigger = (
      <button
        type="button"
        className={cn(ICON_TRIGGER_CLASS, triggerClassName)}
        aria-label={triggerAriaLabel}
        data-state={isOpen ? 'open' : 'closed'}
      >
        <Trash2 className="size-4" />
      </button>
    );
    triggerNode = triggerTooltip ? (
      // Compose the triggers via render props so the button is registered as
      // both the dialog trigger (aria-haspopup, focus return) and the tooltip
      // trigger — a manual onClick would bypass AlertDialogTrigger entirely.
      <Tooltip>
        <TooltipTrigger render={<AlertDialogTrigger render={iconTrigger} />} />
        <TooltipContent>{triggerTooltip}</TooltipContent>
      </Tooltip>
    ) : (
      <AlertDialogTrigger render={iconTrigger} />
    );
  } else if (trigger) {
    const triggerElement = triggerTooltip
      ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
          'data-state': isOpen ? 'open' : 'closed',
        })
      : trigger;
    triggerNode = triggerTooltip ? (
      <Tooltip>
        <TooltipTrigger
          render={<AlertDialogTrigger render={triggerElement} />}
        />
        <TooltipContent>{triggerTooltip}</TooltipContent>
      </Tooltip>
    ) : (
      <AlertDialogTrigger render={trigger} />
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {triggerNode}
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          {/* AlertDialogAction is a plain Button (not a Close primitive) —
              handleConfirm closes the dialog explicitly after confirming. */}
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
