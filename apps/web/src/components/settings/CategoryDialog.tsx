import type { Category } from '@/lib/data-access/categories';
import { CategoryForm } from './CategoryForm';
import { SettingsFormDialog } from './SettingsFormDialog';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export const CategoryDialog = ({
  open,
  onOpenChange,
  category,
}: CategoryDialogProps) => (
  <SettingsFormDialog
    open={open}
    onOpenChange={onOpenChange}
    title={category !== null ? 'Edit category' : 'Add category'}
    formKey={category?.id ?? 'new'}
  >
    <CategoryForm
      category={category}
      onClose={() => onOpenChange(false)}
    />
  </SettingsFormDialog>
);
