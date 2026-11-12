import { XIcon } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

export type ActiveFilterChip<TId extends string = string> = {
  id: TId;
  label: string;
  summary: string;
};

type ActiveFilterChipsProps<TId extends string> = {
  chips: ActiveFilterChip<TId>[];
  onRemove: (id: TId) => void;
  onSelect?: (id: TId) => void;
  onClearAll?: () => void;
  className?: string;
};

export const ActiveFilterChips = <TId extends string>({
  chips,
  onRemove,
  onSelect,
  onClearAll,
  className,
}: ActiveFilterChipsProps<TId>) => {
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => {
        const body = (
          <>
            <span className="text-muted-foreground">{chip.label}:</span>{' '}
            <span className="font-medium">{chip.summary}</span>
          </>
        );
        return (
          <Badge
            key={chip.id}
            variant="secondary"
            className="h-7 max-w-full gap-1 rounded-full ps-3 pe-1 font-normal"
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(chip.id)}
                className="flex min-w-0 items-center gap-1 truncate text-start hover:underline"
              >
                {body}
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-1 truncate">
                {body}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${chip.label} filter`}
              onClick={() => onRemove(chip.id)}
              className="size-5 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </Badge>
        );
      })}
      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 px-2 text-muted-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      ) : null}
    </div>
  );
};
