import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import { CategoryForm } from './CategoryForm';
import type { Category } from '@/lib/data-access/categories';

interface CategoryDialogProps {
  category: Category | null;
  onClose: () => void;
}

export const CategoryDialog = ({ category, onClose }: CategoryDialogProps) => (
  <Dialog
    open={true}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="w-[calc(100%-2rem)] max-w-md">
      <DialogHeader>
        <DialogTitle>
          {category !== null ? 'Edit category' : 'Add category'}
        </DialogTitle>
      </DialogHeader>
      <CategoryForm category={category} onClose={onClose} />
    </DialogContent>
  </Dialog>
);
