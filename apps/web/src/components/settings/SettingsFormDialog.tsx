import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';

interface SettingsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formKey: string;
  children: ReactNode;
}

export const SettingsFormDialog = ({
  open,
  onOpenChange,
  title,
  formKey,
  children,
}: SettingsFormDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div key={formKey}>{children}</div>
    </DialogContent>
  </Dialog>
);
