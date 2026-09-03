import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { NONE_COLUMN } from '../importFormatChoice';

type ImportColumnSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  columns: string[];
  allowNone?: boolean;
};

export const ImportColumnSelect = ({
  id,
  label,
  value,
  onValueChange,
  columns,
  allowNone = false,
}: ImportColumnSelectProps) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allowNone ? <SelectItem value={NONE_COLUMN}>None</SelectItem> : null}
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  </Field>
);
