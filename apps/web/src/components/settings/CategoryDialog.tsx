import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import type { Category } from '@/lib/data-access/categories';
import { CategoryForm } from './CategoryForm';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export const CategoryDialog = ({
  open,
  onOpenChange,
  category,
}: CategoryDialogProps) => {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category !== null ? 'Edit category' : 'Add category'}
          </DialogTitle>
        </DialogHeader>
        <CategoryForm
          key={category?.id ?? 'new'}
          category={category}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
};
