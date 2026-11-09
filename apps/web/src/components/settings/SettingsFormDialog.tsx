import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import type { ReactNode } from 'react';

interface SettingsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formKey: string;
  children: ReactNode;
}

export const SettingsFormDialog = ({
  open,
  onOpenChange,
  title,
  description,
  formKey,
  children,
}: SettingsFormDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div key={formKey}>{children}</div>
    </DialogContent>
  </Dialog>
);
