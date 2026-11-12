import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';

type TransactionFilterTriggerProps = ComponentProps<typeof Button> & {
  icon: LucideIcon;
  label: string;
};

export const TransactionFilterTrigger = ({
  icon: Icon,
  label,
  ...props
}: TransactionFilterTriggerProps) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="max-w-44 gap-1.5 text-xs"
    {...props}
  >
    <Icon className="size-3.5" aria-hidden="true" />
    <span className="truncate">{label}</span>
    <ChevronDownIcon
      className="size-3 text-muted-foreground"
      aria-hidden="true"
    />
  </Button>
);
