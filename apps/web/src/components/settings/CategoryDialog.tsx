import type { Category } from '@ploutizo/validators';
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
    description={
      category !== null
        ? 'Update the category name, icon, and colour.'
        : 'Create a new spending category.'
    }
    formKey={category?.id ?? 'new'}
  >
    <CategoryForm category={category} onClose={() => onOpenChange(false)} />
  </SettingsFormDialog>
);
