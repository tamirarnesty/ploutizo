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
import { Button } from '@ploutizo/ui/components/button';
import { cn } from '@/lib/utils';

interface SettingsRowAlertDialogProps {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  triggerClassName?: string;
}

export const SettingsRowAlertDialog = ({
  triggerLabel,
  title,
  description,
  confirmLabel,
  onConfirm,
  triggerClassName,
}: SettingsRowAlertDialogProps) => (
  <AlertDialog>
    <AlertDialogTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-destructive',
            triggerClassName
          )}
        />
      }
    >
      {triggerLabel}
    </AlertDialogTrigger>
    <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
