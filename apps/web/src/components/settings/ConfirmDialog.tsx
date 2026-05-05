import { useState } from 'react';
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
} from '@ploutizo/ui/components/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  triggerAriaLabel: string;
  triggerClassName?: string;
  tooltip?: string;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const BASE_TRIGGER_CLASS =
  'inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export function ConfirmDialog({
  triggerAriaLabel,
  triggerClassName,
  tooltip,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const triggerButton = (
    <button
      type="button"
      className={cn(BASE_TRIGGER_CLASS, triggerClassName)}
      aria-label={triggerAriaLabel}
      onClick={() => setOpen(true)}
      data-state={open ? 'open' : 'closed'}
    >
      <Trash2 className="size-4" />
    </button>
  );

  return (
    <>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={triggerButton} />
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        triggerButton
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
