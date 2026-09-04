import {
  Select,
  SelectContent,
  SelectGroup,
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
}: CategorySelectProps) => {
  const items = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        <SelectValue>
          {(selected: string) =>
            items.find((item) => item.value === selected)?.label ?? placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
