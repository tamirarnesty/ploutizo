import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Category } from '@/lib/data-access/categories';

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onValueChange: (categoryId: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

export const CategorySelect = ({
  categories,
  value,
  onValueChange,
  disabled = false,
  id,
  placeholder = 'Select category',
  triggerClassName,
  ariaLabel,
}: CategorySelectProps) => (
  <Select
    value={value}
    disabled={disabled}
    onValueChange={(next) => {
      if (next) onValueChange(next);
    }}
  >
    <SelectTrigger id={id} className={triggerClassName} aria-label={ariaLabel}>
      <SelectValue>
        {categories.find((category) => category.id === value)?.name ??
          placeholder}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {categories.map((category) => (
        <SelectItem key={category.id} value={category.id}>
          {category.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
