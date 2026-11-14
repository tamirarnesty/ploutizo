import { AppDialog } from '@/components/overlays/AppDialog';
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
  <AppDialog
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    contentClassName="w-[calc(100%-2rem)] max-w-md"
  >
    <div key={formKey}>{children}</div>
  </AppDialog>
);
