import { Calendar } from '@ploutizo/ui/components/calendar';
import { format, isValid, parseISO } from 'date-fns';
import type { FilterFieldConfig } from '@ploutizo/ui/components/reui/filters';

interface DateRangeFilterRendererProps {
  values: string[];
  onChange: (values: string[]) => void;
}

// Renders inline within the Filters panel — no nested Popover needed.
// A nested portal would cause the outer Filters dropdown to treat calendar
// clicks as "outside" and dismiss before both dates are selected.
const DateRangeFilterRenderer = ({
  values,
  onChange,
}: DateRangeFilterRendererProps) => {
  const [from = '', to = ''] = values;
  const fromDate = from && isValid(parseISO(from)) ? parseISO(from) : undefined;
  const toDate = to && isValid(parseISO(to)) ? parseISO(to) : undefined;

  return (
    <Calendar
      mode="range"
      selected={(fromDate ?? toDate) ? { from: fromDate, to: toDate } : undefined}
      onSelect={(range) => {
        const newFrom = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
        const newTo = range?.to ? format(range.to, 'yyyy-MM-dd') : '';
        onChange([newFrom, newTo]);
      }}
      numberOfMonths={2}
    />
  );
};

export function buildFilterFields(
  accounts: { id: string; name: string }[],
  categories: { id: string; name: string }[],
  members: { id: string; displayName: string }[],
  tags: { id: string; name: string }[]
): FilterFieldConfig<string>[] {
  return [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'expense', label: 'Expense' },
        { value: 'income', label: 'Income' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'settlement', label: 'Settlement' },
        { value: 'refund', label: 'Refund' },
        { value: 'contribution', label: 'Contribution' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'custom',
      defaultOperator: 'between',
      // Date range uses between operator: values are [from, to] strings
      customRenderer: ({ values, onChange }) => (
        <DateRangeFilterRenderer values={values} onChange={onChange} />
      ),
    },
    {
      key: 'accountId',
      label: 'Account',
      type: 'select',
      options: accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'assigneeId',
      label: 'Assignee',
      type: 'select',
      options: members.map((m) => ({ value: m.id, label: m.displayName })),
    },
    {
      key: 'tagIds',
      label: 'Tags',
      type: 'multiselect',
      defaultOperator: 'is_any_of',
      options: tags.map((t) => ({ value: t.id, label: t.name })),
    },
  ];
}
